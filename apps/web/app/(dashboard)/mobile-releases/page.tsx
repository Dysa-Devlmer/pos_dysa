import type { Metadata } from "next";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";

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
    <div className="space-y-6">
      <PageHeader
        title="Mobile Releases"
        subtitle={
          <>
            Publicación de APKs para la app móvil DyPos CL. Solo el release
            marcado como <strong>latest</strong> se distribuye a los usuarios.
            Los APKs se sirven desde{" "}
            <code className="rounded bg-muted px-1 text-xs">
              apk-dypos.zgamersa.com
            </code>
            .
          </>
        }
      />

      <MobileReleasesClient releases={serializableReleases} />
    </div>
  );
}
