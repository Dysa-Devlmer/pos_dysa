"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RangoFechasFiltro({
  desde,
  hasta,
}: {
  desde: string | null;
  hasta: string | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [desdeV, setDesdeV] = React.useState(desde ?? "");
  const [hastaV, setHastaV] = React.useState(hasta ?? "");

  React.useEffect(() => {
    setDesdeV(desde ?? "");
    setHastaV(hasta ?? "");
  }, [desde, hasta]);

  const aplicar = () => {
    const params = new URLSearchParams(sp.toString());
    if (desdeV) params.set("desde", desdeV);
    else params.delete("desde");
    if (hastaV) params.set("hasta", hastaV);
    else params.delete("hasta");
    router.push(`/ventas?${params.toString()}`);
  };

  const limpiar = () => {
    setDesdeV("");
    setHastaV("");
    router.push("/ventas");
  };

  const hayFiltro = Boolean(desde || hasta);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        aplicar();
      }}
      className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-3"
    >
      <div className="flex items-center gap-1 text-sm font-medium">
        <CalendarRange className="size-4" />
        Filtrar por fecha
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="desde" className="text-xs">
            Desde
          </Label>
          <Input
            key={`desde-${desde ?? "empty"}`}
            id="desde"
            type="date"
            value={desdeV}
            onChange={(e) => setDesdeV(e.target.value)}
            className="w-[160px] [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hasta" className="text-xs">
            Hasta
          </Label>
          <Input
            key={`hasta-${hasta ?? "empty"}`}
            id="hasta"
            type="date"
            value={hastaV}
            onChange={(e) => setHastaV(e.target.value)}
            className="w-[160px] [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Aplicar
        </Button>
        {hayFiltro ? (
          <Button type="button" variant="outline" size="sm" onClick={limpiar}>
            <X className="size-3" />
            Limpiar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
