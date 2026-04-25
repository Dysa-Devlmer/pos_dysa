import type { MetadataRoute } from "next";

/**
 * S1 (audit 2026-04-25) — robots.txt explicito.
 *
 * El sistema es B2B (POS, no e-commerce publico) → todo el dashboard,
 * APIs y autenticacion deben quedar fuera del index. Solo /login y
 * /privacidad son crawl-friendly (landing publico futuro + cumplimiento
 * Ley 21.719).
 *
 * Antes: sin robots.ts → Next emitia un default permisivo en runtime
 * y Google indexaba el HTML del login junto con paths /api/* devolviendo
 * 401 (mal SEO + leak de estructura interna).
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_URL ?? "https://pos.dyon.cl";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/login", "/privacidad"],
        disallow: [
          "/",
          "/api/",
          "/dashboard",
          "/caja",
          "/ventas",
          "/productos",
          "/clientes",
          "/categorias",
          "/usuarios",
          "/devoluciones",
          "/reportes",
          "/perfil",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
