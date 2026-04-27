"use client";

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";

import { restaurarVenta } from "../actions";
import { Button } from "@/components/ui/button";

export function RestaurarBoton({
  id,
  numeroBoleta,
}: {
  id: number;
  numeroBoleta: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    const razon =
      typeof window !== "undefined"
        ? window.prompt(
            `Restaurar venta ${numeroBoleta}. Esto re-aplicará el stock. Razón (opcional):`,
          )
        : null;
    // null = cancel
    if (razon === null) return;

    startTransition(async () => {
      const res = await restaurarVenta(id, razon || undefined);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Soft revalidatePath ya corre del lado server; un refresh visual
      // con location.reload() asegura ver la fila quitada en navegadores
      // que cachearon RSC.
      window.location.reload();
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={onClick}
      >
        <Undo2 className="size-3.5" />
        {pending ? "Restaurando…" : "Restaurar"}
      </Button>
      {error ? (
        <span className="max-w-[240px] text-right text-[11px] text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
