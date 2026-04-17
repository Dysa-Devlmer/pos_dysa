import type { NextAuthConfig } from "next-auth";

const adminRoutes = ["/usuarios"];

export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
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
        const rol = (auth?.user as { rol?: string })?.rol;
        if (rol !== "ADMIN") {
          return Response.redirect(new URL("/", nextUrl));
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
