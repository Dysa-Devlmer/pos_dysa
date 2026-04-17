"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

// TODO: En producción, implementar rate limiting con Upstash Ratelimit + Redis
// para prevenir brute-force en login. Ejemplo:
//   import { Ratelimit } from "@upstash/ratelimit";
//   const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60s") });

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" };
    }
    throw error;
  }

  redirect("/");
}
