import type { Metadata } from "next";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MobileReleasesClient } from "./mobile-releases-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mobile Releases" };

export default async function MobileReleasesPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.rol !== "ADMIN") {
    redirect("/?error=admin-required");
  }

  const releases = await prisma.mobileRelease.findMany({
    orderBy: [{ platform: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      platform: true,
      version: true,
      versionCode: true,
      apkUrl: true,
      notes: true,
      minVersion: true,
      isLatest: true,
      publishedAt: true,
    },
  });

  // Serializar fechas a string para client component (RSC boundary).
  const serializableReleases = releases.map((r) => ({
    ...r,
    publishedAt: r.publishedAt.toISOString(),
  }));

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mobile Releases</h1>
        <p className="text-muted-foreground mt-2">
          Publicación de APKs para la app móvil DyPos CL. Solo el release
          marcado como <strong>latest</strong> se distribuye a los usuarios.
          Los APKs se sirven desde{" "}
          <code className="bg-muted rounded px-1 text-sm">
            apk-dypos.zgamersa.com
          </code>
          .
        </p>
      </header>

      <MobileReleasesClient releases={serializableReleases} />
    </div>
  );
}
