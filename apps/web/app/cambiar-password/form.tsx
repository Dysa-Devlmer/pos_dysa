"use client";

import { useActionState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarPasswordObligatorio } from "./actions";

export function CambiarPasswordForm() {
  const [state, action, pending] = useActionState(
    cambiarPasswordObligatorio,
    undefined,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="nueva">Nueva contraseña</Label>
        <Input
          id="nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={200}
          disabled={pending}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmar">Confirmar nueva contraseña</Label>
        <Input
          id="confirmar"
          name="confirmar"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={200}
          disabled={pending}
        />
      </div>

      {state?.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Guardando…
          </>
        ) : (
          "Guardar nueva contraseña"
        )}
      </Button>
    </form>
  );
}
