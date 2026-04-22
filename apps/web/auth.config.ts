import type { NextAuthConfig, Session } from "next-auth";

const adminRoutes = ["/usuarios"];

export default {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    // Propaga rol e id del JWT → session.user en CUALQUIER runtime (edge incluido).
    // Sin este callback aquí, el middleware edge recibe una Session default
    // (solo name/email) y `rol` se pierde aunque el JWT lo tenga.
    // Este callback es puro (sin Prisma) → edge-safe.
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.rol = token.rol as Session["user"]["rol"];
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false;

      if (adminRoutes.some((r) => nextUrl.pathname.startsWith(r))) {
        if (auth?.user?.rol !== "ADMIN") {
          return Response.redirect(new URL("/", nextUrl));
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
