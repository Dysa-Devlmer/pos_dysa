import type { MetadataRoute } from "next";

/**
 * F-7.2 (audit 2026-04-25) — sitemap minimo.
 *
 * Solo incluye paginas publicas (login + privacidad). Resto del POS
 * es B2B autenticado y va disallow en robots.ts (S1).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_URL ?? "https://pos.dyon.cl";
  const lastModified = new Date();
  return [
    {
      url: `${base}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${base}/privacidad`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
