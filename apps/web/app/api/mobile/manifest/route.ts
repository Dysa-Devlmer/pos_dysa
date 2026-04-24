import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdmin, requireRateLimit, jsonError } from "@/app/api/v1/_helpers";

/**
 * Mobile release manifest endpoint.
 *
 * GET (público, rate-limited):
 *   Consultado por la app mobile al arrancar (antes del login) para detectar
 *   updates disponibles. Devuelve el MobileRelease con `isLatest = true`
 *   para la plataforma solicitada.
 *
 *   Query: ?platform=ANDROID|IOS  (default: ANDROID)
 *
 *   Response:
 *     200 — { version, versionCode, apkUrl, notes, minVersion, publishedAt }
 *     404 — sin release publicado aún (primera instalación del sistema)
 *
 * POST (admin, rate-limited):
 *   Publica una nueva release. Flip atómico de `isLatest` via $transaction.
 *
 *   Body: { platform, version, versionCode, apkUrl, notes?, minVersion? }
 *
 * Por qué vive fuera de /api/v1 y no usa el pattern de v1:
 *   - /api/v1 está pensado para integración B2B (requiere Bearer token).
 *   - Este endpoint NECESITA ser público en GET (la app consulta pre-login).
 *   - Contrato simple orientado a máquina — no paginación, no filtros.
 *   - Middleware matcher lo excluye explícitamente (ver apps/web/middleware.ts).
 */

const platformSchema = z.enum(["ANDROID", "IOS"]);

const postBodySchema = z.object({
  platform: platformSchema.default("ANDROID"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Debe ser semver: X.Y.Z"),
  versionCode: z.number().int().positive(),
  apkUrl: z.string().url(),
  notes: z.string().max(2000).optional(),
  minVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .optional(),
});

export async function GET(request: Request) {
  // Rate limit agresivo: la app puede llamar en cada open, pero con cache
  // del lado cliente (React Query staleTime 5 min). Si alguien spamea sin
  // cache, bloqueamos.
  const limited = await requireRateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const platformRaw = searchParams.get("platform") ?? "ANDROID";
  const parsed = platformSchema.safeParse(platformRaw);
  if (!parsed.success) {
    return jsonError("platform debe ser ANDROID o IOS", 400);
  }
  const platform = parsed.data;

  const release = await prisma.mobileRelease.findFirst({
    where: { platform, isLatest: true },
    select: {
      version: true,
      versionCode: true,
      apkUrl: true,
      notes: true,
      minVersion: true,
      publishedAt: true,
      platform: true,
    },
  });

  if (!release) {
    // 404 — no hay release publicado todavía. La app debe tratar esto como
    // "no hay update disponible" (no crashear). Response explícito para
    // debugging fácil.
    return NextResponse.json(
      {
        error: "No hay releases publicadas para esta plataforma",
        platform,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(release, {
    headers: {
      // CDN-level caching: 5 min fresh, 1h stale-while-revalidate. La app
      // también cachea clientside con React Query, pero el cache HTTP
      // reduce carga al backend si 1000 apps abren simultáneamente.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

export async function POST(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;

  const { session, error } = await requireAuth(request);
  if (error) return error;
  const adminError = requireAdmin(session);
  if (adminError) return adminError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body inválido — se esperaba JSON", 400);
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      `Body inválido: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      400,
    );
  }
  const { platform, version, versionCode, apkUrl, notes, minVersion } = parsed.data;

  // Validación anti-rollback: el versionCode nuevo DEBE ser mayor al último
  // publicado. Android rechaza APKs con versionCode menor — publicar uno
  // así sería una trampa (la DB diría "hay update" pero Android rechazaría
  // la instalación).
  const currentLatest = await prisma.mobileRelease.findFirst({
    where: { platform, isLatest: true },
    select: { versionCode: true, version: true },
  });

  if (currentLatest && versionCode <= currentLatest.versionCode) {
    return jsonError(
      `versionCode (${versionCode}) debe ser mayor al latest (${currentLatest.versionCode} / v${currentLatest.version}). Android rechaza downgrades.`,
      409,
    );
  }

  // Flip atómico de isLatest: desmarcar el anterior + crear el nuevo como
  // latest en una sola transacción. Garantiza invariante "solo 1 latest
  // por plataforma a la vez".
  const userId = (session.user as { id?: string | number }).id;
  const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;

  const release = await prisma.$transaction(async (tx) => {
    await tx.mobileRelease.updateMany({
      where: { platform, isLatest: true },
      data: { isLatest: false },
    });

    return tx.mobileRelease.create({
      data: {
        platform,
        version,
        versionCode,
        apkUrl,
        notes,
        minVersion,
        isLatest: true,
        publishedBy: Number.isFinite(numericUserId as number)
          ? (numericUserId as number)
          : null,
      },
    });
  });

  return NextResponse.json(release, { status: 201 });
}
