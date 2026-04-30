"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <main className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2">
      {/* ─────────────────── Branding panel (izquierda, dark siempre) ─────────────────── */}
      <aside className="relative hidden overflow-hidden bg-[#0a0a0a] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        {/* Ambient glow animado */}
        <div
          className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.4), transparent 70%)",
            animation: "drift-glow 18s ease-in-out infinite",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-16 size-[24rem] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.3), transparent 70%)",
            animation: "drift-glow-b 22s ease-in-out infinite",
          }}
        />

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative flex items-center gap-3 text-white"
        >
          <div
            className="flex size-11 items-center justify-center rounded-xl shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, #f97316 0%, #b45309 100%)",
              boxShadow: "0 8px 24px -8px rgba(249,115,22,0.5)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0a0a0a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M11 2 L13 2 L13 8 L19 8 L19 16 L13 16 L13 22 L11 22 L11 16 L5 16 L5 8 L11 8 Z" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">
              DyPos CL
            </span>
            <span className="text-xs text-white/50">
              Punto de venta inteligente
            </span>
          </div>
        </motion.div>

        {/* Headline serif */}
        <div className="relative max-w-md space-y-6 text-white">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          >
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight xl:text-6xl">
              Tu negocio,
              <br />
              <span
                className="italic"
                style={{
                  background:
                    "linear-gradient(100deg, #fb923c 0%, #f59e0b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                tus reglas.
              </span>
            </h1>
            <p className="mt-5 max-w-sm text-base text-white/60">
              Ventas en segundos, boletas al instante y reportes listos para
              tu contador — optimizado para retail en Chile.
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative flex items-center justify-between text-xs text-white/40"
        >
          <span>© {new Date().getFullYear()} DyPos CL</span>
          <span className="font-mono">v1.0.0</span>
        </motion.div>

        <style jsx>{`
          @keyframes drift-glow {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            50% {
              transform: translate(-20px, 20px) scale(1.1);
            }
          }
          @keyframes drift-glow-b {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            50% {
              transform: translate(20px, -20px) scale(1.15);
            }
          }
        `}</style>
      </aside>

      {/* ─────────────────── Form panel (derecha / mobile full) ─────────────────── */}
      <section className="flex min-h-screen items-center justify-center p-6 lg:min-h-0 lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Brand mobile-only */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M11 2 L13 2 L13 8 L19 8 L19 16 L13 16 L13 22 L11 22 L11 16 L5 16 L5 8 L11 8 Z" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight">
              DyPos CL
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-4xl tracking-tight">
              Bienvenido de vuelta
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>

          <form action={formAction} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@dypos-cl.cl"
                required
                autoComplete="email"
                autoFocus
                className="h-12 bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <Link
                  href="#"
                  tabIndex={-1}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                  onClick={(e) => e.preventDefault()}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-12 bg-muted/50"
              />
            </div>

            <AnimatePresence mode="wait">
              {state?.error ? (
                <motion.div
                  key="login-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    x: [0, -8, 8, -6, 6, -3, 3, 0],
                  }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                    x: { duration: 0.45, ease: "easeInOut" },
                  }}
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{state.error}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-sm font-semibold shadow-lg shadow-primary/20 transition-shadow hover:shadow-primary/40"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Ingresando…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Protegido con autenticación segura y rate limiting.
          </p>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} DyPos CL · v1.0.0
          </p>
        </motion.div>
      </section>
    </main>
  );
}
