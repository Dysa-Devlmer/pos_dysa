"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, FileSpreadsheet, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ReporteFiltrosProps {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
}

export function ReporteFiltros({ desde, hasta }: ReporteFiltrosProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const [desdeV, setDesdeV] = React.useState(desde);
  const [hastaV, setHastaV] = React.useState(hasta);

  React.useEffect(() => {
    setDesdeV(desde);
    setHastaV(hasta);
  }, [desde, hasta]);

  const aplicar = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams(sp.toString());
    params.set("desde", desdeV);
    params.set("hasta", hastaV);
    router.push(`/reportes?${params.toString()}`);
  };

  const limpiar = () => {
    router.push("/reportes");
  };

  const qs = `?desde=${encodeURIComponent(desdeV)}&hasta=${encodeURIComponent(hastaV)}`;

  return (
    <form
      onSubmit={aplicar}
      className="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <CalendarRange className="size-4" />
        Rango de fechas
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-none sm:flex sm:gap-3">
        <div className="space-y-1">
          <Label htmlFor="desde" className="text-xs">
            Desde
          </Label>
          <Input
            id="desde"
            type="date"
            value={desdeV}
            onChange={(e) => setDesdeV(e.target.value)}
            max={hastaV || undefined}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hasta" className="text-xs">
            Hasta
          </Label>
          <Input
            id="hasta"
            type="date"
            value={hastaV}
            onChange={(e) => setHastaV(e.target.value)}
            min={desdeV || undefined}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:ml-auto">
        <Button type="submit" size="sm">
          Aplicar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={limpiar}>
          <X className="size-3" />
          Mes actual
        </Button>

        <Button asChild variant="outline" size="sm">
          <a href={`/api/reportes/pdf${qs}`} target="_blank" rel="noopener">
            <FileText className="size-4" />
            Descargar PDF
          </a>
        </Button>

        <Button asChild size="sm">
          <a href={`/api/reportes/excel${qs}`}>
            <FileSpreadsheet className="size-4" />
            Descargar Excel
          </a>
        </Button>
      </div>
    </form>
  );
}
