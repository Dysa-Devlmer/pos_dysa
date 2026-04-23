import NextAuth from "next-auth";
import authConfig from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

// /api/v1 excluido del middleware NextAuth deliberadamente:
// — Usa autenticación propia por API Key (Bearer token en x-api-key header)
// — Validada en apps/web/app/api/v1/_helpers.ts → requireAuth()
// — No depende de sesión JWT de NextAuth para permitir acceso B2B
// — Rate limiting propio por IP vía Upstash (@/lib/rate-limit)
//
// /privacidad excluido: página pública de la Política de Privacidad.
// DEBE ser accesible sin login para cumplir requisitos de Apple App Store
// y Google Play Store (URL pública sin auth). No remover.
export const config = {
  matcher: [
    "/((?!api/auth|api/health|api/docs|api/v1|_next/static|_next/image|favicon.ico|manifest.webmanifest|manifest.json|icon-192.png|icon-512.png|privacidad).*)",
  ],
};

export default middleware;
