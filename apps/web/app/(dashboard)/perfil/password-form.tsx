"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cambiarPassword } from "./actions";

// ──────────────────────────────────────────────────────────────────────────
// Strength meter
// ──────────────────────────────────────────────────────────────────────────

type NivelFuerza = {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  // Progreso 0-100 para barra
  pct: number;
  // Clase bg de tailwind
  barClass: string;
  // Clase text
  textClass: string;
};

function evaluarFuerza(pwd: string): NivelFuerza {
  const len = pwd.length;
  if (len === 0) {
    return {
      level: 0,
      label: "—",
      pct: 0,
      barClass: "bg-muted",
      textClass: "text-muted-foreground",
    };
  }
  const tieneNumero = /\d/.test(pwd);
  const tieneMayus = /[A-Z]/.test(pwd);
  const tieneEspecial = /[^A-Za-z0-9]/.test(pwd);

  if (len < 6) {
    return {
      level: 0,
      label: "Muy débil",
      pct: 15,
      barClass: "bg-red-500",
      textClass: "text-red-600 dark:text-red-400",
    };
  }
  if (len < 8 || (!tieneNumero && !tieneMayus)) {
    return {
      level: 1,
      label: "Débil",
      pct: 30,
      barClass: "bg-orange-500",
      textClass: "text-orange-600 dark:text-orange-400",
    };
  }
  if (len < 10 && !(tieneNumero && tieneMayus)) {
    return {
      level: 2,
      label: "Regular",
      pct: 55,
      barClass: "bg-yellow-500",
      textClass: "text-yellow-700 dark:text-yellow-400",
    };
  }
  if (len >= 12 && tieneNumero && tieneMayus && tieneEspecial) {
    return {
      level: 4,
      label: "Muy fuerte",
      pct: 100,
      barClass: "bg-emerald-600",
      textClass: "text-emerald-700 dark:text-emerald-400",
    };
  }
  if (len >= 10 && tieneNumero && tieneMayus) {
    return {
      level: 3,
      label: "Fuerte",
      pct: 80,
      barClass: "bg-green-500",
      textClass: "text-green-700 dark:text-green-400",
    };
  }
  return {
    level: 2,
    label: "Regular",
    pct: 55,
    barClass: "bg-yellow-500",
    textClass: "text-yellow-700 dark:text-yellow-400",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Form
// ──────────────────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    actual: z.string().min(1, "Ingresa tu contraseña actual"),
    nueva: z.string().min(6, "Mínimo 6 caracteres").max(200),
    confirmar: z.string().min(1, "Repite la nueva contraseña"),
  })
  .refine((v) => v.nueva === v.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  })
  .refine((v) => v.nueva !== v.actual, {
    path: ["nueva"],
    message: "La nueva contraseña debe ser distinta a la actual",
  });

type FormValues = z.infer<typeof formSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Password input con ojito
// ──────────────────────────────────────────────────────────────────────────

interface PwdInputProps extends React.ComponentProps<"input"> {
  id: string;
}

const PwdInput = React.forwardRef<HTMLInputElement, PwdInputProps>(
  function PwdInput({ id, ...props }, ref) {
    const [shown, setShown] = React.useState(false);
    return (
      <div className="relative">
        <Input
          id={id}
          ref={ref}
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          className="pr-10"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={shown ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

export function PasswordForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { actual: "", nueva: "", confirmar: "" },
  });

  const nueva = form.watch("nueva") ?? "";
  const strength = React.useMemo(() => evaluarFuerza(nueva), [nueva]);

  async function onSubmit(values: FormValues) {
    const res = await cambiarPassword(values);
    if (!res.ok) {
      toast.error("No se pudo cambiar", { description: res.error });
      return;
    }
    toast.success("Contraseña actualizada", {
      description: "Usa tu nueva contraseña en el próximo inicio de sesión.",
    });
    form.reset({ actual: "", nueva: "", confirmar: "" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="actual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña actual</FormLabel>
                    <FormControl>
                      <PwdInput
                        id="actual"
                        placeholder="Tu contraseña actual"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nueva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <PwdInput
                        id="nueva"
                        placeholder="Mínimo 6 caracteres"
                        {...field}
                      />
                    </FormControl>

                    <div className="space-y-1 pt-1">
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={strength.pct}
                        aria-label={`Fuerza de contraseña: ${strength.label}`}
                      >
                        <motion.div
                          className={`h-full rounded-full ${strength.barClass}`}
                          initial={false}
                          animate={{ width: `${strength.pct}%` }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        />
                      </div>
                      <p
                        className={`text-xs font-medium ${strength.textClass}`}
                      >
                        Fuerza: {strength.label}
                      </p>
                    </div>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nueva contraseña</FormLabel>
                    <FormControl>
                      <PwdInput
                        id="confirmar"
                        placeholder="Repite la nueva contraseña"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
