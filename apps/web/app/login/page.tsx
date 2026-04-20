"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Zap,
  BarChart3,
  Boxes,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

const FEATURES = [
  {
    icon: Zap,
    title: "Ventas en segundos",
    desc: "Caja fluida con atajos de teclado y búsqueda instantánea",
  },
  {
    icon: BarChart3,
    title: "Reportes en tiempo real",
    desc: "KPIs, gráficos y exportes a PDF/Excel en un clic",
  },
  {
    icon: Boxes,
    title: "Control de stock automático",
    desc: "Alertas de stock bajo y movimientos sincronizados por venta",
  },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-5">
      {/* ─────────────────── Branding panel (izquierda, solo desktop) ─────────────────── */}
      <aside className="relative hidden overflow-hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
        {/* Gradient + blobs */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
        <div className="absolute -left-24 -top-24 -z-10 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 -z-10 size-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div
          className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Logo + brand */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3 text-white"
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
            <Sparkles className="size-6 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">POS Chile</span>
            <span className="text-xs text-white/60">Punto de venta inteligente</span>
          </div>
        </motion.div>

        {/* Headline + features */}
        <div className="relative max-w-md space-y-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="space-y-3"
          >
            <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              El punto de venta{" "}
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                inteligente
              </span>{" "}
              para tu negocio.
            </h1>
            <p className="text-base text-white/70">
              Optimizado para retail en Chile — CLP, IVA 19%, boletas y reportes
              listos para tu contador.
            </p>
          </motion.div>

          <ul className="space-y-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.li
                  key={f.title}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.25 + i * 0.08,
                    ease: "easeOut",
                  }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <Icon className="size-4 text-white" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-white">{f.title}</p>
                    <p className="text-sm text-white/60">{f.desc}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-between text-xs text-white/50"
        >
          <span>© {new Date().getFullYear()} POS Chile</span>
          <span className="font-mono">v1.0.0</span>
        </motion.div>
      </aside>

      {/* ─────────────────── Form panel (derecha / mobile full) ─────────────────── */}
      <section className="flex min-h-screen items-center justify-center bg-muted/30 p-6 lg:col-span-3 lg:min-h-0 lg:bg-background lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Brand mobile-only */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">POS Chile</span>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-black/5 sm:p-8">
            <div className="mb-6 space-y-1.5">
              <h2 className="text-2xl font-semibold tracking-tight">
                Bienvenido de vuelta
              </h2>
              <p className="text-sm text-muted-foreground">
                Inicia sesión con tus credenciales para continuar
              </p>
            </div>

            <form action={formAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@pos-chile.cl"
                  required
                  autoComplete="email"
                  autoFocus
                  className="h-11 focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    href="#"
                    tabIndex={-1}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
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
                  className="h-11 focus-visible:ring-2 focus-visible:ring-primary/40"
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
                className="h-11 w-full text-sm font-medium"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Protegido con autenticación segura y rate limiting.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} POS Chile · v1.0.0
          </p>
        </motion.div>
      </section>
    </main>
  );
}
