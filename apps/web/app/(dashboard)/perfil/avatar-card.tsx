"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Loader2, X } from "lucide-react";
import type { Rol } from "@repo/db";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { gradientePorNombre, inicialesDe } from "@/lib/avatar";
import { ROL_BADGE } from "@/lib/badge-styles";

function formatFechaLarga(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

const MAX_BYTES = 2 * 1024 * 1024;

export interface AvatarCardProps {
  nombre: string;
  email: string;
  rol: Rol;
  avatarInicial: string | null;
  createdAt: string; // ISO
}

export function AvatarCard({
  nombre,
  email,
  rol,
  avatarInicial,
  createdAt,
}: AvatarCardProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = React.useState<string | null>(avatarInicial);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const iniciales = inicialesDe(nombre);
  const gradient = gradientePorNombre(nombre);

  const imagenMostrada = preview ?? avatar;

  const onSelectFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset para permitir re-seleccionar mismo archivo
    if (!file) return;

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error("Formato no soportado", {
        description: "Usa JPEG, PNG o WebP.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Archivo muy pesado", {
        description: `Máximo 2 MB. Tamaño: ${(file.size / 1024 / 1024).toFixed(1)} MB`,
      });
      return;
    }

    // Preview inmediato via FileReader
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const res = await fetch("/api/perfil/avatar", {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        avatar?: string;
        error?: string;
        bytes?: number;
      };
      if (!res.ok || !body.ok || !body.avatar) {
        throw new Error(body.error ?? "Error al subir la imagen");
      }
      setAvatar(body.avatar);
      setPreview(null);
      toast.success("Avatar actualizado", {
        description: body.bytes
          ? `Guardado · ${(body.bytes / 1024).toFixed(0)} KB`
          : undefined,
      });
      router.refresh();
    } catch (err) {
      setPreview(null);
      toast.error("No se pudo subir", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setUploading(false);
    }
  };

  const cancelarPreview = () => {
    setPreview(null);
  };

  return (
    <Card className="overflow-hidden">
      <div
        className={`h-20 w-full bg-gradient-to-br ${gradient} opacity-80`}
        aria-hidden
      />
      <CardContent className="-mt-12 space-y-4 px-6 pb-6">
        <div className="relative mx-auto size-28 shrink-0">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={imagenMostrada ?? "initials"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 overflow-hidden rounded-full ring-4 ring-background shadow-lg"
            >
              {imagenMostrada ? (
                <Image
                  src={imagenMostrada}
                  alt={nombre}
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient} text-3xl font-bold text-white`}
                >
                  {iniciales}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          ) : (
            <button
              type="button"
              onClick={onSelectFile}
              disabled={uploading}
              className="absolute bottom-0 right-0 inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-4 ring-background transition hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cambiar foto"
            >
              <Camera className="size-4" />
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold leading-tight">{nombre}</h2>
          <p className="text-xs text-muted-foreground">{email}</p>
          <Badge variant="outline" className={`mt-1 ${ROL_BADGE[rol]}`}>
            {rol}
          </Badge>
        </div>

        <div className="space-y-2 border-t pt-3 text-center text-xs text-muted-foreground">
          <p>
            Miembro desde{" "}
            <span className="font-medium text-foreground">
              {formatFechaLarga(new Date(createdAt))}
            </span>
          </p>
        </div>

        {preview && !uploading ? (
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelarPreview}
            >
              <X className="size-4" />
              Descartar preview
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onSelectFile}
            disabled={uploading}
          >
            <Camera className="size-4" />
            {avatar ? "Cambiar foto" : "Subir foto"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
