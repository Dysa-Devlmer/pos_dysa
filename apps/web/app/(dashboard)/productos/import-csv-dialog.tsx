"use client";

/**
 * Dialog de importación CSV de productos (Fase 3A).
 *
 * Flujo de 3 estados:
 *   1. idle: dropzone + descargar plantilla + checkbox "actualizar existentes".
 *   2. preview: tabla con N válidas + M errores; botón "Confirmar" o "Volver".
 *   3. done: summary {created, updated, skipped} + botón "Cerrar".
 *
 * Decisiones UX (Pierre 2026-05-01):
 *   - Solo web. Solo ADMIN puede ver el botón (gate server-side por la action).
 *   - All-or-nothing: si hay UN error, "Confirmar" queda disabled.
 *   - Plantilla descargable con headers + 2 filas ejemplo.
 *
 * NO usa libs externas para CSV (parser inline en import-actions.ts) ni
 * para drag-drop (input file nativo + drag listeners). Mantiene bundle
 * chico y control total sobre encoding edge cases (CP-1252 mal exportado
 * por Excel Windows, BOM UTF-8, etc.).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, FileText, Upload, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  buildCsvTemplate,
  type ImportPreview,
  type ImportSummary,
  type ParsedRow,
  type RowError,
} from "./import-helpers";
import {
  commitImportProductos,
  previewImportProductos,
} from "./import-actions";

type State =
  | { kind: "idle" }
  | { kind: "parsing"; filename: string }
  | {
      kind: "preview";
      filename: string;
      preview: ImportPreview;
      actualizarExistentes: boolean;
    }
  | { kind: "committing"; filename: string }
  | { kind: "done"; summary: ImportSummary };

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportCsvDialog({ open, onOpenChange }: ImportCsvDialogProps) {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ kind: "idle" });
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset al cerrar.
  React.useEffect(() => {
    if (!open) {
      setState({ kind: "idle" });
      setDragActive(false);
    }
  }, [open]);

  const handleFile = React.useCallback(async (file: File) => {
    setState({ kind: "parsing", filename: file.name });
    const fd = new FormData();
    fd.append("file", file);
    const res = await previewImportProductos(fd);
    if (!res.ok) {
      toast.error(res.error);
      setState({ kind: "idle" });
      return;
    }
    setState({
      kind: "preview",
      filename: file.name,
      preview: res.data!,
      actualizarExistentes: false,
    });
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (state.kind !== "preview") return;
    if (state.preview.errors.length > 0) return;
    setState({ kind: "committing", filename: state.filename });
    const res = await commitImportProductos({
      rows: state.preview.validRows,
      actualizarExistentes: state.actualizarExistentes,
      filename: state.filename,
    });
    if (!res.ok) {
      toast.error(res.error);
      // Volvemos al preview para que el admin reintente.
      setState((s) =>
        s.kind === "committing" && state.kind === "preview"
          ? { ...state }
          : s,
      );
      return;
    }
    setState({ kind: "done", summary: res.data! });
    router.refresh();
  }, [state, router]);

  const handleDownloadTemplate = React.useCallback(() => {
    const csv = buildCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-productos.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar productos desde CSV</DialogTitle>
          <DialogDescription>
            Carga masiva de productos para onboarding rápido. Máximo 5 MB
            o 5.000 filas por archivo.
          </DialogDescription>
        </DialogHeader>

        {state.kind === "idle" || state.kind === "parsing" ? (
          <IdleStep
            state={state}
            dragActive={dragActive}
            inputRef={inputRef}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onPickFile={() => inputRef.current?.click()}
            onFileSelect={(f) => void handleFile(f)}
            onDownloadTemplate={handleDownloadTemplate}
          />
        ) : null}

        {state.kind === "preview" || state.kind === "committing" ? (
          <PreviewStep
            state={state}
            onUpdateActualizar={(v) => {
              if (state.kind === "preview") {
                setState({ ...state, actualizarExistentes: v });
              }
            }}
            onConfirm={() => void handleConfirm()}
            onCancel={() => setState({ kind: "idle" })}
          />
        ) : null}

        {state.kind === "done" ? (
          <DoneStep
            summary={state.summary}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ─── Step: idle / parsing ───────────────────────────────────────────────────

function IdleStep({
  state,
  dragActive,
  inputRef,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onPickFile,
  onFileSelect,
  onDownloadTemplate,
}: {
  state: { kind: "idle" } | { kind: "parsing"; filename: string };
  dragActive: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onPickFile: () => void;
  onFileSelect: (f: File) => void;
  onDownloadTemplate: () => void;
}) {
  const parsing = state.kind === "parsing";
  return (
    <div className="space-y-4">
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={parsing ? undefined : onPickFile}
        role="button"
        tabIndex={0}
        aria-disabled={parsing}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 px-6 py-12 text-center transition",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/60",
          parsing && "cursor-wait opacity-60",
        )}
      >
        <Upload className="size-8 text-muted-foreground" aria-hidden />
        {parsing ? (
          <>
            <p className="text-sm font-medium">
              Procesando {state.filename}…
            </p>
            <p className="text-xs text-muted-foreground">
              Validando filas y consultando categorías.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">
              Arrastra un archivo CSV o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground">
              Máx. 5 MB · 5.000 filas · UTF-8
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelect(f);
            // reset value para permitir re-seleccionar el mismo archivo.
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownloadTemplate}
          disabled={parsing}
        >
          <FileText className="size-4" />
          Descargar plantilla
        </Button>
        <p className="text-xs text-muted-foreground">
          Columnas: <span className="font-mono">nombre, codigoBarras,
          precio, stock, alertaStock, categoria, descripcion, activo</span>
        </p>
      </div>
    </div>
  );
}

// ─── Step: preview / committing ─────────────────────────────────────────────

function PreviewStep({
  state,
  onUpdateActualizar,
  onConfirm,
  onCancel,
}: {
  state:
    | {
        kind: "preview";
        filename: string;
        preview: ImportPreview;
        actualizarExistentes: boolean;
      }
    | { kind: "committing"; filename: string };
  onUpdateActualizar: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (state.kind === "committing") {
    return (
      <div className="space-y-3">
        <Alert>
          <AlertTitle>Confirmando importación de {state.filename}…</AlertTitle>
          <AlertDescription>
            Insertando productos en la base de datos. No cierres esta ventana.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { preview, actualizarExistentes } = state;
  const hasErrors = preview.errors.length > 0;
  const newCount = preview.validRows.length - preview.duplicates.length;

  return (
    <div className="space-y-4">
      <Alert variant={hasErrors ? "destructive" : "default"}>
        <AlertTitle>
          {hasErrors
            ? `${preview.errors.length} error(es) — corrige el CSV antes de importar`
            : `${preview.validRows.length} fila(s) lista(s) para importar`}
        </AlertTitle>
        <AlertDescription>
          Archivo: <span className="font-mono">{state.filename}</span> ·{" "}
          {preview.totalRows} filas leídas
          {!hasErrors && preview.duplicates.length > 0 ? (
            <>
              {" "}
              · {newCount} nuevas + {preview.duplicates.length} ya existen
            </>
          ) : null}
        </AlertDescription>
      </Alert>

      {hasErrors ? (
        <div className="max-h-64 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Fila</th>
                <th className="px-3 py-2 text-left">Campo</th>
                <th className="px-3 py-2 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {preview.errors.slice(0, 100).map((e, i) => (
                <ErrorRow key={i} error={e} />
              ))}
              {preview.errors.length > 100 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-2 text-center text-xs text-muted-foreground"
                  >
                    … y {preview.errors.length - 100} error(es) más
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-h-64 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Fila</th>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {preview.validRows.slice(0, 100).map((r) => (
                <PreviewRow
                  key={r.row}
                  row={r}
                  isDuplicate={preview.duplicates.some(
                    (d) => d.row === r.row,
                  )}
                />
              ))}
              {preview.validRows.length > 100 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-2 text-center text-xs text-muted-foreground"
                  >
                    … y {preview.validRows.length - 100} fila(s) más
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {!hasErrors && preview.duplicates.length > 0 ? (
        <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={actualizarExistentes}
            onChange={(e) => onUpdateActualizar(e.target.checked)}
            className="size-4"
          />
          <span>
            Actualizar productos existentes (
            {preview.duplicates.length} duplicado
            {preview.duplicates.length === 1 ? "" : "s"})
          </span>
        </label>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Volver
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={hasErrors || preview.validRows.length === 0}
          title={
            hasErrors
              ? "Corrige los errores antes de confirmar"
              : "Confirmar importación"
          }
        >
          Confirmar importación
        </Button>
      </DialogFooter>
    </div>
  );
}

function ErrorRow({ error }: { error: RowError }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
        {error.row === 0 ? (
          <span className="inline-flex items-center gap-1">
            <AlertCircle className="size-3" />
            header
          </span>
        ) : (
          error.row
        )}
      </td>
      <td className="px-3 py-1.5 font-mono text-xs">{error.field ?? "—"}</td>
      <td className="px-3 py-1.5 text-destructive">{error.message}</td>
    </tr>
  );
}

function PreviewRow({
  row,
  isDuplicate,
}: {
  row: ParsedRow;
  isDuplicate: boolean;
}) {
  return (
    <tr className="border-t">
      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
        {row.row}
      </td>
      <td className="px-3 py-1.5">{row.nombre}</td>
      <td className="px-3 py-1.5 font-mono text-xs">{row.codigoBarras}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        ${row.precio.toLocaleString("es-CL")}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{row.stock}</td>
      <td className="px-3 py-1.5">{row.categoriaNombre}</td>
      <td className="px-3 py-1.5">
        {isDuplicate ? (
          <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            duplicado
          </span>
        ) : (
          <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            nuevo
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Step: done ─────────────────────────────────────────────────────────────

function DoneStep({
  summary,
  onClose,
}: {
  summary: ImportSummary;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="success">
        <AlertTitle>Importación completada</AlertTitle>
        <AlertDescription>
          Archivo <span className="font-mono">{summary.filename}</span>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCell label="Creados" value={summary.created} tone="success" />
        <SummaryCell
          label="Actualizados"
          value={summary.updated}
          tone="default"
        />
        <SummaryCell
          label="Omitidos"
          value={summary.skipped}
          tone="muted"
        />
      </div>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Cerrar
        </Button>
      </DialogFooter>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "muted";
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "success" && "text-emerald-700 dark:text-emerald-400",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
