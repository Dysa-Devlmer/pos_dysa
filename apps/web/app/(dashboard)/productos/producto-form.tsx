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
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actualizarProducto, crearProducto } from "./actions";

const formSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  descripcion: z.string().trim().max(500).optional(),
  codigoBarras: z.string().trim().min(3, "Mínimo 3 caracteres").max(60),
  categoriaId: z.number().int().positive("Selecciona una categoría"),
  precio: z
    .number()
    .int("Precio debe ser entero (CLP)")
    .nonnegative("No puede ser negativo"),
  stock: z.number().int().nonnegative("No puede ser negativo"),
  alertaStock: z
    .number()
    .int("El umbral debe ser un entero")
    .nonnegative("No puede ser negativo"),
  activo: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export interface ProductoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: Array<{ id: number; nombre: string }>;
  producto?: {
    id: number;
    nombre: string;
    descripcion: string | null;
    codigoBarras: string;
    categoriaId: number;
    precio: number;
    stock: number;
    alertaStock: number;
    activo: boolean;
  } | null;
}

const DEFAULTS: FormValues = {
  nombre: "",
  descripcion: "",
  codigoBarras: "",
  categoriaId: 0,
  precio: 0,
  stock: 0,
  alertaStock: 5,
  activo: true,
};

export function ProductoForm({
  open,
  onOpenChange,
  categorias,
  producto,
}: ProductoFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(producto);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        nombre: producto?.nombre ?? "",
        descripcion: producto?.descripcion ?? "",
        codigoBarras: producto?.codigoBarras ?? "",
        categoriaId: producto?.categoriaId ?? 0,
        precio: producto?.precio ?? 0,
        stock: producto?.stock ?? 0,
        alertaStock: producto?.alertaStock ?? 5,
        activo: producto?.activo ?? true,
      });
      setServerError(null);
    }
  }, [open, producto, form]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const payload = {
      nombre: values.nombre,
      descripcion: values.descripcion || undefined,
      codigoBarras: values.codigoBarras,
      categoriaId: values.categoriaId,
      precio: values.precio,
      stock: values.stock,
      alertaStock: values.alertaStock,
      activo: values.activo,
    };
    const res = isEdit
      ? await actualizarProducto(producto!.id, payload)
      : await crearProducto(payload);
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
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del producto."
              : "Agrega un nuevo producto al catálogo."}
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
              name="nombre"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Coca-Cola 1.5L" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigoBarras"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de barras</FormLabel>
                  <FormControl>
                    <Input placeholder="7801234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.length === 0 ? (
                        <SelectItem value="0" disabled>
                          No hay categorías — crea una primero
                        </SelectItem>
                      ) : (
                        categorias.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio (CLP)</FormLabel>
                  <FormControl>
                    <MoneyInput
                      name={field.name}
                      onBlur={field.onBlur}
                      value={Number.isFinite(field.value) ? field.value : 0}
                      onValueChange={(v) => field.onChange(v)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isFinite(field.value) ? field.value : 0}
                      onChange={(e) => {
                        const v = e.target.valueAsNumber;
                        field.onChange(Number.isFinite(v) ? v : 0);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alertaStock"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Umbral de alerta de stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="5"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isFinite(field.value) ? field.value : 0}
                      onChange={(e) => {
                        const v = e.target.valueAsNumber;
                        field.onChange(Number.isFinite(v) ? v : 0);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Se enviará alerta cuando el stock sea menor o igual a este
                    valor. Por defecto: 5.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
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
              name="activo"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Estado</FormLabel>
                  <Select
                    value={field.value ? "activo" : "inactivo"}
                    onValueChange={(v) => field.onChange(v === "activo")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
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
