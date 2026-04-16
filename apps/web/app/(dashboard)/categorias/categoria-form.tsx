"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actualizarCategoria, crearCategoria } from "./actions";

const formSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(60),
  descripcion: z.string().trim().max(200).optional(),
  activa: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export interface CategoriaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria?: {
    id: number;
    nombre: string;
    descripcion: string | null;
    activa: boolean;
  } | null;
}

export function CategoriaForm({
  open,
  onOpenChange,
  categoria,
}: CategoriaFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(categoria);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: categoria?.nombre ?? "",
      descripcion: categoria?.descripcion ?? "",
      activa: categoria?.activa ?? true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        nombre: categoria?.nombre ?? "",
        descripcion: categoria?.descripcion ?? "",
        activa: categoria?.activa ?? true,
      });
      setServerError(null);
    }
  }, [open, categoria, form]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const payload = {
      nombre: values.nombre,
      descripcion: values.descripcion || undefined,
      activa: values.activa,
    };
    const res = isEdit
      ? await actualizarCategoria(categoria!.id, payload)
      : await crearCategoria(payload);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos de la categoría."
              : "Agrega una nueva categoría al catálogo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Bebidas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción breve" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select
                    value={field.value ? "activa" : "inactiva"}
                    onValueChange={(v) => field.onChange(v === "activa")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="activa">Activa</SelectItem>
                      <SelectItem value="inactiva">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Guardando..."
                  : isEdit
                    ? "Guardar cambios"
                    : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
