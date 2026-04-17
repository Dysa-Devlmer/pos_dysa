import NextAuth from "next-auth";
import authConfig from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api/auth|api/health|api/docs|api/v1|_next/static|_next/image|favicon.ico).*)"],
};

export default middleware;
