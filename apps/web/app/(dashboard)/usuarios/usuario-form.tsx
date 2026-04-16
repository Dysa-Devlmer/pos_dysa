"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Rol } from "@repo/db";

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
  FormDescription,
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
import { actualizarUsuario, crearUsuario } from "./actions";

const ROLES: Rol[] = ["ADMIN", "CAJERO", "VENDEDOR"];

const createSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  email: z.string().trim().email("Email inválido").max(120),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  rol: z.enum(["ADMIN", "CAJERO", "VENDEDOR"]),
  activo: z.boolean(),
});

const editSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  email: z.string().trim().email("Email inválido").max(120),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 6, "Mínimo 6 caracteres"),
  rol: z.enum(["ADMIN", "CAJERO", "VENDEDOR"]),
  activo: z.boolean(),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

export interface UsuarioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: {
    id: number;
    nombre: string;
    email: string;
    rol: Rol;
    activo: boolean;
  } | null;
}

export function UsuarioForm({
  open,
  onOpenChange,
  usuario,
}: UsuarioFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(usuario);

  const form = useForm<EditValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      nombre: "",
      email: "",
      password: "",
      rol: "CAJERO",
      activo: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        nombre: usuario?.nombre ?? "",
        email: usuario?.email ?? "",
        password: "",
        rol: usuario?.rol ?? "CAJERO",
        activo: usuario?.activo ?? true,
      });
      setServerError(null);
    }
  }, [open, usuario, form]);

  async function onSubmit(values: EditValues) {
    setServerError(null);

    if (isEdit) {
      const payload = {
        nombre: values.nombre,
        email: values.email,
        rol: values.rol,
        activo: values.activo,
        password: values.password || undefined,
      };
      const res = await actualizarUsuario(usuario!.id, payload);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
    } else {
      const payload: CreateValues = {
        nombre: values.nombre,
        email: values.email,
        password: values.password ?? "",
        rol: values.rol,
        activo: values.activo,
      };
      const res = await crearUsuario(payload);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del usuario. Deja la contraseña en blanco para no cambiarla."
              : "Crea un nuevo usuario del sistema. La contraseña se guarda con bcrypt."}
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="usuario@poschile.cl"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contraseña
                    {isEdit ? " (opcional)" : null}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEdit ? "Dejar vacío para mantener" : "••••••"}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  {isEdit ? (
                    <FormDescription>
                      Solo se actualiza si ingresas una nueva.
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem>
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
