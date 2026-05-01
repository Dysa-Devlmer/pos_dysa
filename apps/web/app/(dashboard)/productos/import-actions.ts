"use server";

/**
 * CSV Import — server actions (Fase 3A · 2026-05-01).
 *
 * Onboarding rápido para clientes con catálogos grandes (DR-08 cerrado).
 *
 * Flujo:
 *   1. Cliente sube CSV via FormData (max 5 MB, max 5_000 filas).
 *   2. `previewImportProductos` parsea + normaliza + valida fila por fila +
 *      resuelve categorías + detecta duplicados.
 *   3. Si hay UN error → dry-run reporta TODOS los errores; nada se inserta.
 *   4. Si TODO valida → `commitImportProductos` hace bulk insert / update
 *      en una sola transacción + AuditLog del resumen.
 *
 * Decisiones aprobadas (Pierre 2026-05-01):
 *   - Q1.1: categoría por NOMBRE (no id).
 *   - Q1.2: precio acepta "1990", "1.990", "$1.990". Rechaza "1990,50".
 *   - Q2: duplicados → skip default; checkbox `actualizarExistentes`.
 *   - Q3: categoría inexistente → error por fila (NO auto-crear).
 *   - Q4: pre-validación all-or-nothing.
 *   - Q5: 5 MB / 5.000 filas.
 *   - Q9: AuditLog accion CREATE + diff {import, count, ...}.
 *
 * NO incluye:
 *   - API REST (/api/v1/productos/import) — solo Server Action en este sprint.
 *   - Idempotency-Key — el flujo es admin-confirmado manualmente.
 *   - Mobile UI — el dropzone de file no es UX natural para mobile.
 *
 * Helpers, tipos, constantes y plantilla viven en `import-helpers.ts`
 * (Next.js prohíbe exports no-async desde un archivo "use server").
 */

import { revalidatePath } from "next/cache";
import { Prisma, prisma, AuditAccion } from "@repo/db";
import { auth } from "@/auth";

import {
  MAX_FILE_SIZE,
  MAX_ROWS,
  parseCsvText,
  parseRowsToProductos,
  validateCommitPayload,
  type ActionResult,
  type ImportPreview,
  type ImportSummary,
  type ParsedRow,
} from "./import-helpers";

const PAYLOAD_INVALIDO_MSG =
  "Preview inválido o desactualizado. Vuelve a subir el CSV.";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.rol !== "ADMIN") {
    throw new Error("Solo ADMIN puede importar productos");
  }
  return session;
}

/**
 * Server Action — recibe el FormData con file CSV, parsea, valida contra DB
 * (categorías existentes + duplicados), y retorna preview SIN insertar.
 *
 * El UI muestra el preview; si todo OK, llama `commitImportProductos`.
 */
export async function previewImportProductos(
  formData: FormData,
): Promise<ActionResult<ImportPreview>> {
  try {
    await requireAdmin();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "No se recibió un archivo válido." };
    }
    if (file.size === 0) {
      return { ok: false, error: "El archivo está vacío." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        ok: false,
        error: `Archivo muy grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
      };
    }

    const text = await file.text();
    const { headers, rows } = parseCsvText(text);

    if (rows.length === 0) {
      return {
        ok: false,
        error: "El CSV no tiene filas de datos (solo header o vacío).",
      };
    }
    if (rows.length > MAX_ROWS) {
      return {
        ok: false,
        error: `Demasiadas filas (${rows.length}). Máximo ${MAX_ROWS}. Divide el archivo en partes.`,
      };
    }

    const { parsed, errors } = parseRowsToProductos(headers, rows);

    // Resolver categorías por nombre. Una sola query.
    const categoriaNames = Array.from(
      new Set(parsed.map((p) => p.categoriaNombre)),
    );
    const categorias = await prisma.categoria.findMany({
      where: { nombre: { in: categoriaNames }, activa: true },
      select: { id: true, nombre: true },
    });
    const catByNombre = new Map(categorias.map((c) => [c.nombre, c.id]));

    for (const p of parsed) {
      const id = catByNombre.get(p.categoriaNombre);
      if (id === undefined) {
        errors.push({
          row: p.row,
          field: "categoria",
          message: `categoria "${p.categoriaNombre}" no existe (debe estar activa). Crea la categoría primero o corrige el nombre.`,
        });
      } else {
        p.categoriaId = id;
      }
    }

    // Detectar duplicados por codigoBarras dentro del mismo CSV.
    const seenCodigos = new Map<string, number>();
    for (const p of parsed) {
      const prev = seenCodigos.get(p.codigoBarras);
      if (prev !== undefined) {
        errors.push({
          row: p.row,
          field: "codigoBarras",
          message: `codigoBarras "${p.codigoBarras}" duplicado en fila ${prev} del mismo CSV.`,
        });
      } else {
        seenCodigos.set(p.codigoBarras, p.row);
      }
    }

    // Verificar duplicados en DB (warnings, no errors — el commit decide).
    const codigosBd = await prisma.producto.findMany({
      where: { codigoBarras: { in: parsed.map((p) => p.codigoBarras) } },
      select: { codigoBarras: true },
    });
    const codigosBdSet = new Set(codigosBd.map((p) => p.codigoBarras));
    const duplicates = parsed
      .filter((p) => codigosBdSet.has(p.codigoBarras))
      .map((p) => ({ row: p.row, codigoBarras: p.codigoBarras }));

    // validRows = filas SIN errores asociados.
    const errorRowSet = new Set(errors.filter((e) => e.row > 0).map((e) => e.row));
    const validRows = parsed.filter((p) => !errorRowSet.has(p.row));

    return {
      ok: true,
      data: {
        validRows,
        errors,
        duplicates,
        totalRows: rows.length,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al procesar el CSV.",
    };
  }
}

/**
 * Commit del import — bulk insert + (opcional) bulk update existentes.
 * Asume que el caller ya hizo previewImportProductos y validó OK.
 *
 * Política Q4 (all-or-nothing): si algo falla DENTRO del commit (ej.
 * categoría borrada entre preview y commit), la transacción Prisma
 * hace rollback total.
 */
export async function commitImportProductos(args: {
  rows: ParsedRow[];
  actualizarExistentes: boolean;
  filename: string;
}): Promise<ActionResult<ImportSummary>> {
  try {
    const session = await requireAdmin();
    const usuarioId = Number(session.user.id);
    const { rows, actualizarExistentes, filename } = args;

    if (rows.length === 0) {
      return { ok: false, error: "No hay filas válidas para importar." };
    }

    // Defensa: revalidar payload server-side. Aunque la UI manda
    // `preview.validRows` intacto, no podemos confiar en el cliente.
    const payloadError = validateCommitPayload(rows);
    if (payloadError !== null) {
      return { ok: false, error: PAYLOAD_INVALIDO_MSG };
    }

    // Re-resolver categoriaId server-side (defensa: no confiar en el client).
    const categoriaNames = Array.from(
      new Set(rows.map((p) => p.categoriaNombre)),
    );
    const categorias = await prisma.categoria.findMany({
      where: { nombre: { in: categoriaNames }, activa: true },
      select: { id: true, nombre: true },
    });
    const catByNombre = new Map(categorias.map((c) => [c.nombre, c.id]));
    for (const p of rows) {
      const id = catByNombre.get(p.categoriaNombre);
      if (id === undefined) {
        return {
          ok: false,
          error: `Categoría "${p.categoriaNombre}" no existe en DB (fila ${p.row}). Refresca el preview.`,
        };
      }
      p.categoriaId = id;
    }

    const summary = await prisma.$transaction(async (tx) => {
      // Lookup productos existentes por codigoBarras.
      const existentes = await tx.producto.findMany({
        where: { codigoBarras: { in: rows.map((p) => p.codigoBarras) } },
        select: { id: true, codigoBarras: true },
      });
      const existentesMap = new Map(
        existentes.map((p) => [p.codigoBarras, p.id]),
      );

      let created = 0;
      let updated = 0;
      let skipped = 0;

      const toCreate: Prisma.ProductoCreateManyInput[] = [];
      const toUpdate: { id: number; data: Prisma.ProductoUpdateInput }[] = [];

      for (const p of rows) {
        const existeId = existentesMap.get(p.codigoBarras);
        if (existeId !== undefined) {
          if (actualizarExistentes) {
            toUpdate.push({
              id: existeId,
              data: {
                nombre: p.nombre,
                descripcion: p.descripcion,
                precio: p.precio,
                stock: p.stock,
                alertaStock: p.alertaStock,
                activo: p.activo,
                // ProductoUpdateInput requiere connect en relaciones, no FK
                // crudo. La FK directa solo es válida en createMany /
                // ProductoUncheckedUpdateInput.
                categoria: { connect: { id: p.categoriaId! } },
              },
            });
          } else {
            skipped += 1;
          }
          continue;
        }
        toCreate.push({
          nombre: p.nombre,
          descripcion: p.descripcion,
          codigoBarras: p.codigoBarras,
          precio: p.precio,
          stock: p.stock,
          alertaStock: p.alertaStock,
          activo: p.activo,
          categoriaId: p.categoriaId!,
        });
      }

      if (toCreate.length > 0) {
        const result = await tx.producto.createMany({ data: toCreate });
        created = result.count;
      }

      for (const u of toUpdate) {
        await tx.producto.update({ where: { id: u.id }, data: u.data });
        updated += 1;
      }

      // AuditLog — accion CREATE con diff que documenta la operación bulk.
      // Q9: tabla "productos", registroId 0 (sentinel bulk),
      // diff = { import: "csv", filename, count, ... }.
      await tx.auditLog.create({
        data: {
          tabla: "productos",
          registroId: 0,
          accion: AuditAccion.CREATE,
          usuarioId,
          ip: null,
          userAgent: null,
          diff: {
            import: "csv",
            action: "PRODUCTOS_IMPORT_CSV",
            filename,
            actualizarExistentes,
            totalRows: rows.length,
            created,
            updated,
            skipped,
          },
        },
      });

      return { created, updated, skipped, filename } satisfies ImportSummary;
    });

    revalidatePath("/productos");
    revalidatePath("/alertas");
    revalidatePath("/", "layout");

    return { ok: true, data: summary };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al confirmar la importación.",
    };
  }
}
