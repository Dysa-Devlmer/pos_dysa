"use server";

/**
 * Server Actions — Gestión de Mobile Releases (DyPos CL Admin).
 *
 * Bloque 5 SaaS pivot 2026-04-30: UI para que el ADMIN publique APKs
 * desde el dashboard sin tocar `curl` ni el endpoint REST manualmente.
 *
 * Flujos cubiertos:
 *
 *   - publicarRelease(formData): recibe APK file + metadata, lo
 *     guarda en disco bajo APK_STORAGE_DIR, crea MobileRelease
 *     en BD con isLatest=true (flip atómico del anterior).
 *
 *   - eliminarRelease(id): borra el archivo APK + la fila DB. Usa
 *     soft-delete del DB schema (no hay para MobileRelease — hard
 *     delete OK porque los APKs viejos no son data fiscal).
 *
 *   - marcarLatest(id): cambia el flag `isLatest` flippeando todos
 *     los otros para la misma plataforma a false.
 *
 * Storage: APK files se guardan en `process.env.APK_STORAGE_DIR`
 * (default `/var/www/apks/<platform>/`). El nginx vhost
 * `apk-dypos.zgamersa.com` debe estar configurado para servir esa
 * carpeta como public read-only.
 *
 * Validaciones:
 *
 *   - Solo rol ADMIN puede invocar (verificado en cada action).
 *   - APK debe tener content-type `application/vnd.android.package-archive`
 *     o extensión `.apk`.
 *   - Tamaño max 100 MB (defaultsentire APK release < 100 MB).
 *   - versionCode debe ser mayor al actual latest (anti-rollback).
 *   - version debe ser semver válido (X.Y.Z).
 *
 * Rate limits: server actions de Next.js no tienen rate limit
 * builtin — el middleware aplica el general 100 req/min por IP.
 */

import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma, MobilePlatform } from "@repo/db";
import { auth } from "@/auth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  if (session.user.rol !== "ADMIN") {
    throw new Error("Solo ADMIN puede gestionar releases");
  }
  return session;
}

const APK_STORAGE_DIR = process.env.APK_STORAGE_DIR ?? "/var/www/apks";
const APK_PUBLIC_BASE_URL =
  process.env.APK_PUBLIC_BASE_URL ?? "https://apk-dypos.zgamersa.com";
const MAX_APK_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

const releaseSchema = z.object({
  platform: z.enum(["ANDROID", "IOS"]),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Debe ser semver: X.Y.Z (ej: 1.0.4)"),
  versionCode: z.coerce
    .number()
    .int()
    .positive("versionCode debe ser entero positivo"),
  notes: z.string().max(2000).optional(),
  minVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "minVersion debe ser semver X.Y.Z")
    .optional()
    .or(z.literal("")),
});

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ─── publicarRelease ─────────────────────────────────────────────────────────

/**
 * Publica una nueva release. Recibe FormData del form web con:
 *   - platform: "ANDROID" | "IOS"
 *   - version: "1.0.4"
 *   - versionCode: "5"
 *   - apk: File (binary)
 *   - notes (optional)
 *   - minVersion (optional)
 *
 * Side-effects:
 *   1. Guarda el APK en `<APK_STORAGE_DIR>/<platform>/<filename>.apk`
 *   2. Crea MobileRelease con isLatest=true
 *   3. Desmarca el latest anterior de la misma plataforma
 *   4. Revalida `/mobile-releases` para reflejar en el listing
 */
export async function publicarRelease(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdmin();

    // Parse + validate metadata
    const parsed = releaseSchema.safeParse({
      platform: formData.get("platform"),
      version: formData.get("version"),
      versionCode: formData.get("versionCode"),
      notes: formData.get("notes") || undefined,
      minVersion: formData.get("minVersion") || undefined,
    });

    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ?? "Datos del release inválidos",
      };
    }

    const { platform, version, versionCode, notes, minVersion } = parsed.data;

    // Anti-rollback check
    const currentLatest = await prisma.mobileRelease.findFirst({
      where: { platform: platform as MobilePlatform, isLatest: true },
      select: { versionCode: true, version: true },
    });

    if (currentLatest && versionCode <= currentLatest.versionCode) {
      return {
        ok: false,
        error: `versionCode ${versionCode} debe ser mayor que el latest actual (${currentLatest.versionCode} = v${currentLatest.version}). Android rechaza downgrades.`,
      };
    }

    // Validate APK file
    const apkFile = formData.get("apk");
    if (!apkFile || !(apkFile instanceof File)) {
      return { ok: false, error: "APK file es obligatorio" };
    }

    if (apkFile.size === 0) {
      return { ok: false, error: "APK file está vacío" };
    }

    if (apkFile.size > MAX_APK_SIZE_BYTES) {
      return {
        ok: false,
        error: `APK pesa ${(apkFile.size / 1024 / 1024).toFixed(1)} MB. Max permitido: ${MAX_APK_SIZE_BYTES / 1024 / 1024} MB.`,
      };
    }

    // Validate file type (lenient — algunos browsers no setean content-type
    // correcto para .apk). Aceptamos si extensión es .apk.
    const fileName = apkFile.name;
    if (!fileName.toLowerCase().endsWith(".apk") && platform === "ANDROID") {
      return {
        ok: false,
        error: "El archivo debe tener extensión .apk para platform ANDROID",
      };
    }

    // Save to disk
    const platformDir = path.join(APK_STORAGE_DIR, platform.toLowerCase());
    await mkdir(platformDir, { recursive: true });

    const safeFileName = `dypos-cl-v${version}-build${versionCode}.apk`;
    const filePath = path.join(platformDir, safeFileName);

    const buffer = Buffer.from(await apkFile.arrayBuffer());
    await writeFile(filePath, buffer);

    const apkUrl = `${APK_PUBLIC_BASE_URL}/${platform.toLowerCase()}/${safeFileName}`;

    // DB: flip atómico isLatest + create
    const userId = (session.user as { id?: string | number }).id;
    const numericUserId =
      typeof userId === "string" ? parseInt(userId, 10) : userId;

    const release = await prisma.$transaction(async (tx) => {
      await tx.mobileRelease.updateMany({
        where: {
          platform: platform as MobilePlatform,
          isLatest: true,
        },
        data: { isLatest: false },
      });

      return await tx.mobileRelease.create({
        data: {
          platform: platform as MobilePlatform,
          version,
          versionCode,
          apkUrl,
          notes: notes ?? null,
          minVersion: minVersion ?? null,
          isLatest: true,
          publishedBy: numericUserId,
        },
        select: { id: true },
      });
    });

    revalidatePath("/mobile-releases");
    return { ok: true, data: { id: release.id } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al publicar release",
    };
  }
}

// ─── eliminarRelease ─────────────────────────────────────────────────────────

export async function eliminarRelease(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const release = await prisma.mobileRelease.findUnique({
      where: { id },
      select: { apkUrl: true, isLatest: true, version: true },
    });

    if (!release) {
      return { ok: false, error: "Release no encontrada" };
    }

    if (release.isLatest) {
      return {
        ok: false,
        error: `No se puede eliminar la release ${release.version} porque está marcada como latest. Marca otra como latest primero.`,
      };
    }

    // Borrar el archivo APK del filesystem
    try {
      const fileName = path.basename(new URL(release.apkUrl).pathname);
      const platform = new URL(release.apkUrl).pathname.split("/")[1] ?? "android";
      const filePath = path.join(APK_STORAGE_DIR, platform, fileName);
      await unlink(filePath).catch(() => {
        // El archivo puede no existir (storage rotado, restore parcial).
        // No fallar la operación por eso.
      });
    } catch {
      // URL parsing puede fallar si apkUrl está malformado en BD vieja.
    }

    await prisma.mobileRelease.delete({ where: { id } });

    revalidatePath("/mobile-releases");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al eliminar release",
    };
  }
}

// ─── marcarLatest ────────────────────────────────────────────────────────────

export async function marcarLatest(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const release = await prisma.mobileRelease.findUnique({
      where: { id },
      select: { id: true, platform: true, version: true, isLatest: true },
    });

    if (!release) {
      return { ok: false, error: "Release no encontrada" };
    }

    if (release.isLatest) {
      return { ok: false, error: "Esta release ya es la latest" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.mobileRelease.updateMany({
        where: { platform: release.platform, isLatest: true },
        data: { isLatest: false },
      });
      await tx.mobileRelease.update({
        where: { id },
        data: { isLatest: true },
      });
    });

    revalidatePath("/mobile-releases");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al marcar latest",
    };
  }
}
