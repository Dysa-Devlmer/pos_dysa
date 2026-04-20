"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  /** Retornar `false` explícito evita que el dialog se cierre (útil para errores inline). */
  onConfirm: () => void | boolean | Promise<void | boolean>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "¿Estás seguro?",
  description = "Esta acción no se puede deshacer.",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "destructive",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const busy = loading || isPending;

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await onConfirm();
      if (result !== false) onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (busy ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Procesando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
