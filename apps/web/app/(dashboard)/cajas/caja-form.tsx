"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  actualizarCaja,
  crearCaja,
  type CajaInput,
} from "./actions";
import type { CajaRow } from "./types";

interface CajaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caja: CajaRow | null;
}

export function CajaForm({ open, onOpenChange, caja }: CajaFormProps) {
  const editing = caja !== null;
  const [nombre, setNombre] = React.useState("");
  const [ubicacion, setUbicacion] = React.useState("");
  const [activa, setActiva] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNombre(caja?.nombre ?? "");
      setUbicacion(caja?.ubicacion ?? "");
      setActiva(caja?.activa ?? true);
      setError(null);
    }
  }, [open, caja]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const input: CajaInput = {
      nombre: nombre.trim(),
      ubicacion: ubicacion.trim() || undefined,
      activa,
    };

    const res = editing
      ? await actualizarCaja(caja!.id, input)
      : await crearCaja(input);

    setPending(false);

    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }

    toast.success(editing ? "Caja actualizada" : "Caja creada");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar caja" : "Nueva caja"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Actualiza los datos de la caja registradora."
                : "Registra una caja registradora física del local."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej: Caja Principal"
              required
              minLength={2}
              maxLength={80}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación</Label>
            <Input
              id="ubicacion"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="ej: Local Santiago Centro"
              maxLength={120}
              disabled={pending}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activa}
              onChange={(e) => setActiva(e.target.checked)}
              disabled={pending}
              className="size-4"
            />
            Caja activa (disponible para abrir turnos)
          </label>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? editing
                  ? "Guardando..."
                  : "Creando..."
                : editing
                  ? "Guardar cambios"
                  : "Crear caja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
