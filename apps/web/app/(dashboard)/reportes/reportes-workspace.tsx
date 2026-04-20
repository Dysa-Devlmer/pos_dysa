"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange,
  Clock,
  FileSpreadsheet,
  FileText,
  History,
  Receipt,
  RotateCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─────────────────────────── History (local) ───────────────────────────
export interface HistoryEntry {
  id: string;
  tipo: "ventas";
  formato: "pdf" | "excel";
  desde: string;
  hasta: string;
  generadoEn: number; // epoch ms
}

const HISTORY_KEY = "reportes:history:v1";
const HISTORY_MAX = 5;

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "hace instantes";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

function formatRangoCorto(desde: string, hasta: string): string {
  const d = desde.split("-").reverse().slice(0, 2).join("/");
  const h = hasta.split("-").reverse().slice(0, 2).join("/");
  return `${d} → ${h}`;
}

// ─────────────────────────── Component ───────────────────────────
export interface ReportesWorkspaceProps {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  ventasEnPeriodo: number;
}

export function ReportesWorkspace({
  desde,
  hasta,
  ventasEnPeriodo,
}: ReportesWorkspaceProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const [desdeV, setDesdeV] = React.useState(desde);
  const [hastaV, setHastaV] = React.useState(hasta);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [generating, setGenerating] = React.useState<
    null | "ventas-pdf" | "ventas-excel"
  >(null);

  React.useEffect(() => {
    setDesdeV(desde);
    setHastaV(hasta);
  }, [desde, hasta]);

  React.useEffect(() => {
    setHistory(loadHistory());
  }, []);

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
  const dirty = desdeV !== desde || hastaV !== hasta;
  const sinDatos = ventasEnPeriodo === 0;

  const registrar = (formato: "pdf" | "excel") => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tipo: "ventas",
      formato,
      desde: desdeV,
      hasta: hastaV,
      generadoEn: Date.now(),
    };
    const next = [entry, ...history].slice(0, HISTORY_MAX);
    setHistory(next);
    saveHistory(next);
    // Indicador visual breve de "generating"
    const key = `ventas-${formato}` as const;
    setGenerating(key);
    window.setTimeout(() => setGenerating(null), 1200);
  };

  const limpiarHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  return (
    <div className="space-y-6">
      {/* ─────── Date range picker ─────── */}
      <motion.form
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={aplicar}
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarRange className="size-4 text-muted-foreground" />
          Rango de fechas
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
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
              className="h-9"
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
              className="h-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button type="submit" size="sm" disabled={!dirty}>
            Aplicar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={limpiar}>
            <RotateCcw className="size-3" />
            Mes actual
          </Button>
        </div>
      </motion.form>

      {/* ─────── Report type cards ─────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5"
        >
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-70" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">Reporte de Ventas</h3>
                <p className="text-xs text-muted-foreground">
                  Detalle completo con boleta, cliente, método e IVA
                </p>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 tabular-nums">
              {ventasEnPeriodo} {ventasEnPeriodo === 1 ? "venta" : "ventas"}
            </Badge>
          </div>

          <div className="relative mt-2 text-xs text-muted-foreground">
            Período: <span className="font-medium text-foreground">{formatRangoCorto(desdeV, hastaV)}</span>
          </div>

          <div className="relative flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              className="gap-2"
              disabled={sinDatos}
            >
              <a
                href={sinDatos ? undefined : `/api/reportes/pdf${qs}`}
                target="_blank"
                rel="noopener"
                aria-disabled={sinDatos}
                onClick={(e) => {
                  if (sinDatos) {
                    e.preventDefault();
                    return;
                  }
                  registrar("pdf");
                }}
              >
                <FileText className="size-4" />
                {generating === "ventas-pdf" ? "Generando..." : "Descargar PDF"}
              </a>
            </Button>
            <Button asChild className="gap-2" disabled={sinDatos}>
              <a
                href={sinDatos ? undefined : `/api/reportes/excel${qs}`}
                aria-disabled={sinDatos}
                onClick={(e) => {
                  if (sinDatos) {
                    e.preventDefault();
                    return;
                  }
                  registrar("excel");
                }}
              >
                <FileSpreadsheet className="size-4" />
                {generating === "ventas-excel"
                  ? "Generando..."
                  : "Descargar Excel"}
              </a>
            </Button>
          </div>

          {sinDatos ? (
            <p className="relative text-xs text-muted-foreground">
              Sin ventas en el período seleccionado — ajusta el rango de fechas.
            </p>
          ) : null}
        </motion.div>

        {/* ─────── History panel ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Últimos reportes</h3>
            </div>
            {history.length > 0 ? (
              <button
                type="button"
                onClick={limpiarHistory}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Limpiar
              </button>
            ) : null}
          </div>

          {history.length === 0 ? (
            <EmptyState
              illustration="chart"
              title="Sin historial"
              description="Aquí verás los últimos 5 reportes que generes en este navegador."
              className="border-none bg-transparent py-4"
            />
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {history.map((h) => (
                  <motion.li
                    key={h.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 rounded-lg border bg-background/50 p-2.5"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      {h.formato === "pdf" ? (
                        <FileText className="size-4 text-muted-foreground" />
                      ) : (
                        <FileSpreadsheet className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        Ventas ·{" "}
                        <span className="uppercase">{h.formato}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground tabular-nums">
                        {formatRangoCorto(h.desde, h.hasta)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                      <Clock className="size-3" />
                      {formatRelative(h.generadoEn)}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
}
