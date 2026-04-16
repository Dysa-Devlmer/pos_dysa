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
import { validarRUT } from "@/lib/utils";
import { actualizarCliente, crearCliente } from "./actions";

const formSchema = z.object({
  rut: z
    .string()
    .trim()
    .min(3, "RUT requerido")
    .refine((v) => validarRUT(v), "RUT inválido"),
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Email inválido",
    ),
  telefono: z.string().trim().max(30).optional(),
  direccion: z.string().trim().max(200).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface ClienteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: {
    id: number;
    rut: string;
    nombre: string;
    email: string | null;
    telefono: string | null;
    direccion: string | null;
  } | null;
}

export function ClienteForm({
  open,
  onOpenChange,
  cliente,
}: ClienteFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(cliente);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rut: "",
      nombre: "",
      email: "",
      telefono: "",
      direccion: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        rut: cliente?.rut ?? "",
        nombre: cliente?.nombre ?? "",
        email: cliente?.email ?? "",
        telefono: cliente?.telefono ?? "",
        direccion: cliente?.direccion ?? "",
      });
      setServerError(null);
    }
  }, [open, cliente, form]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const payload = {
      rut: values.rut,
      nombre: values.nombre,
      email: values.email || undefined,
      telefono: values.telefono || undefined,
      direccion: values.direccion || undefined,
    };
    const res = isEdit
      ? await actualizarCliente(cliente!.id, payload)
      : await crearCliente(payload);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del cliente."
              : "Registra un nuevo cliente."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <FormField
              control={form.control}
              name="rut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUT</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="12.345.678-9"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="cliente@correo.cl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+56 9 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, comuna" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                {serverError}
              </p>
            ) : null}

            <DialogFooter className="sm:col-span-2">
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
