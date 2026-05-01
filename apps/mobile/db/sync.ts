import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid/non-secure";

import {
  CrearVentaRequestSchema,
  VentaCreadaResponseSchema,
  type CrearVentaRequest,
  type VentaCreada,
} from "@repo/api-client";
import { ApiClientError } from "@repo/api-client";

import { apiClient } from "@/stores/authStore";

import { getDb } from "./client";
import { syncMeta, syncQueue, type SyncQueueRow } from "./schema";

/**
 * Sync worker — offline-first (M5).
 *
 * Responsabilidades:
 *   - Encolar ventas creadas offline (`enqueueVenta`)
 *   - Drenar la queue hacia POST /api/v1/ventas (`flushSyncQueue`)
 *   - Contar pendientes (`countPending`)
 *   - Listar failed para UI (`listFailed`)
 *   - Resolver failed manualmente (retry / delete, `retryFailed` /
 *     `deleteQueueItem`)
 *
 * Política de reintentos:
 *   - Error de red (ApiClientError sin status, o timeout) → retry
 *     implícito: se queda pending, `intentos++`. El próximo flush la
 *     reintentará.
 *   - 409 (stock insuficiente) → **failed**, NO retry automático.
 *     Server-wins (G-M04): el cajero decide qué hacer (borrar la venta
 *     y rehacerla ajustando cantidad, o forzar descarga de la venta
 *     si otro operador ya la procesó).
 *   - 401 → failed con mensaje claro. Requiere re-login manual.
 *   - 5xx → pending + intentos++. El server se recupera solo.
 *   - Otros 4xx (400, 422) → failed. Probablemente bug de contract o
 *     datos corruptos; no tiene sentido retry.
 */

// ─── Enqueue ─────────────────────────────────────────────────────────────

/**
 * Valida payload con Zod ANTES de escribir a SQLite. Si alguien llama
 * esta función con datos basura, mejor fallar en caja.tsx que descubrirlo
 * durante un flush offline 20 minutos después.
 */
export async function enqueueVenta(
  payload: CrearVentaRequest,
): Promise<string> {
  const validated = CrearVentaRequestSchema.parse(payload);
  const db = await getDb();
  const id = nanoid();

  await db.insert(syncQueue).values({
    id,
    payload: JSON.stringify(validated),
    status: "pending",
    intentos: 0,
  });

  return id;
}

// ─── Read helpers ────────────────────────────────────────────────────────

export async function countPending(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(syncQueue)
    .where(eq(syncQueue.status, "pending"));
  return rows[0]?.c ?? 0;
}

export async function countFailed(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(syncQueue)
    .where(eq(syncQueue.status, "failed"));
  return rows[0]?.c ?? 0;
}

export async function listQueue(): Promise<SyncQueueRow[]> {
  const db = await getDb();
  return db.select().from(syncQueue).orderBy(syncQueue.creadaAt);
}

export async function getLastSync(): Promise<Date | null> {
  const db = await getDb();
  const rows = await db.select().from(syncMeta).where(eq(syncMeta.id, 1));
  return rows[0]?.lastSync ?? null;
}

// ─── Failed resolution ──────────────────────────────────────────────────

export async function retryFailed(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(syncQueue)
    .set({ status: "pending", error: null })
    .where(and(eq(syncQueue.id, id), eq(syncQueue.status, "failed")));
}

export async function deleteQueueItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(syncQueue).where(eq(syncQueue.id, id));
}

// ─── Flush ──────────────────────────────────────────────────────────────

export type FlushResult = {
  synced: number;
  failed: number;
  networkErrors: number;
  createdVentas: VentaCreada[];
};

/**
 * Lock module-scope para evitar flushes concurrentes. Si alguien llama
 * 2× (reconnect + foreground al mismo tiempo), el segundo returns temprano
 * con un "skipped".
 */
let flushInProgress = false;

export async function flushSyncQueue(): Promise<FlushResult | "skipped"> {
  if (flushInProgress) return "skipped";
  flushInProgress = true;

  const result: FlushResult = {
    synced: 0,
    failed: 0,
    networkErrors: 0,
    createdVentas: [],
  };

  try {
    const db = await getDb();
    const pending = await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.status, "pending"))
      .orderBy(syncQueue.creadaAt);

    for (const row of pending) {
      try {
        // Re-validar el payload por si la fila fue escrita por una
        // versión vieja de la app que ya no cumple el contract actual.
        const payload = CrearVentaRequestSchema.parse(
          JSON.parse(row.payload),
        );

        // Fase 2B-P0 — Idempotency-Key reutiliza el nanoid persistente
        // de la fila. En cada retry se reenvía la misma key, así el
        // server (withIdempotencyResponse en /api/v1/ventas) deduplica:
        // si la primera ejecución ya creó la venta y el ACK se perdió,
        // este reintento devuelve la response cacheada sin duplicar.
        const { data: venta } = await apiClient.post(
          "/api/v1/ventas",
          payload,
          VentaCreadaResponseSchema,
          { headers: { "Idempotency-Key": row.id } },
        );

        // 200 → borrar de la queue. No guardamos historial de synced.
        await db.delete(syncQueue).where(eq(syncQueue.id, row.id));
        result.synced += 1;
        result.createdVentas.push(venta);
      } catch (e) {
        await handleFlushError(row, e, result);
      }
    }

    // Si sincronizamos al menos una, actualizar lastSync
    if (result.synced > 0) {
      await db
        .update(syncMeta)
        .set({ lastSync: new Date() })
        .where(eq(syncMeta.id, 1));
    }

    return result;
  } finally {
    flushInProgress = false;
  }
}

async function handleFlushError(
  row: SyncQueueRow,
  e: unknown,
  result: FlushResult,
): Promise<void> {
  const db = await getDb();
  const now = new Date();

  if (e instanceof ApiClientError) {
    // 409 stock / 401 auth / 400/422 validación → failed definitivo.
    // Retry automático no tiene sentido porque el estado del server no
    // va a cambiar solo (G-M04: server-wins, cajero decide).
    if (
      e.status === 409 ||
      e.status === 401 ||
      e.status === 400 ||
      e.status === 422
    ) {
      await db
        .update(syncQueue)
        .set({
          status: "failed",
          error: e.message,
          intentos: row.intentos + 1,
          lastAttemptAt: now,
        })
        .where(eq(syncQueue.id, row.id));
      result.failed += 1;
      return;
    }

    // 5xx o status 0 (sin respuesta) → pending, retry próximo flush.
    await db
      .update(syncQueue)
      .set({
        intentos: row.intentos + 1,
        lastAttemptAt: now,
        error: e.message,
      })
      .where(eq(syncQueue.id, row.id));
    result.networkErrors += 1;
    return;
  }

  // ZodError en el JSON.parse / .parse — payload corrupto. Marcar failed
  // con mensaje descriptivo; no hay forma automática de recuperarse.
  await db
    .update(syncQueue)
    .set({
      status: "failed",
      error:
        e instanceof Error
          ? `Payload inválido: ${e.message}`
          : "Payload inválido (unknown)",
      intentos: row.intentos + 1,
      lastAttemptAt: now,
    })
    .where(eq(syncQueue.id, row.id));
  result.failed += 1;
}
