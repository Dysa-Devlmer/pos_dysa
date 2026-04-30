"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Star, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";

import {
  publicarRelease,
  eliminarRelease,
  marcarLatest,
} from "./actions";

type Release = {
  id: string;
  platform: "ANDROID" | "IOS";
  version: string;
  versionCode: number;
  apkUrl: string;
  notes: string | null;
  minVersion: string | null;
  isLatest: boolean;
  publishedAt: string;
};

interface Props {
  releases: Release[];
}

export function MobileReleasesClient({ releases }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [deleting, setDeleting] = React.useState<Release | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await publicarRelease(formData);

      if (result.ok) {
        toast.success("Release publicada", {
          description: "El APK ya está disponible para los usuarios.",
        });
        formRef.current?.reset();
        router.refresh();
      } else {
        toast.error("Error al publicar", { description: result.error });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarcarLatest = async (id: string, version: string) => {
    const result = await marcarLatest(id);
    if (result.ok) {
      toast.success(`v${version} marcada como latest`);
      router.refresh();
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  const handleEliminar = async () => {
    if (!deleting) return;
    const result = await eliminarRelease(deleting.id);
    if (result.ok) {
      toast.success(`Release v${deleting.version} eliminada`);
      setDeleting(null);
      router.refresh();
    } else {
      toast.error("No se pudo eliminar", { description: result.error });
    }
  };

  const grouped = {
    ANDROID: releases.filter((r) => r.platform === "ANDROID"),
    IOS: releases.filter((r) => r.platform === "IOS"),
  };

  return (
    <div className="space-y-8">
      {/* Form publicar nuevo release */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Publicar nueva release
          </CardTitle>
          <CardDescription>
            El APK se sube al servidor y se marca como latest automáticamente.
            El versionCode debe ser mayor al actual latest (anti-rollback).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="platform">Plataforma</Label>
                <select
                  id="platform"
                  name="platform"
                  required
                  defaultValue="ANDROID"
                  className="border-input bg-background mt-1 flex h-10 w-full rounded-md border px-3 text-sm"
                >
                  <option value="ANDROID">Android (.apk)</option>
                  <option value="IOS">iOS (manual)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="version">Versión (semver)</Label>
                <Input
                  id="version"
                  name="version"
                  required
                  pattern="^\d+\.\d+\.\d+$"
                  placeholder="1.0.5"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="versionCode">versionCode</Label>
                <Input
                  id="versionCode"
                  name="versionCode"
                  type="number"
                  min={1}
                  required
                  placeholder="6"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="apk">Archivo APK (max 100 MB)</Label>
              <Input
                id="apk"
                name="apk"
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="minVersion">
                  minVersion (opcional, fuerza update si user instaló &lt; X.Y.Z)
                </Label>
                <Input
                  id="minVersion"
                  name="minVersion"
                  pattern="^\d+\.\d+\.\d+$"
                  placeholder="1.0.0"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notas de release (opcional)</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={2000}
                placeholder="Mejoras de UX, fixes de scanner, optimización de batería..."
                className="border-input bg-background mt-1 flex w-full rounded-md border px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Subiendo APK..." : "Publicar release"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Listing de releases por plataforma */}
      {(["ANDROID", "IOS"] as const).map((platform) => (
        <Card key={platform}>
          <CardHeader>
            <CardTitle>{platform === "ANDROID" ? "Android" : "iOS"}</CardTitle>
            <CardDescription>
              {grouped[platform].length} release(s) publicada(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {grouped[platform].length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Sin releases publicadas para {platform.toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-3">
                {grouped[platform].map((r) => (
                  <div
                    key={r.id}
                    className="border-border flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-semibold">
                          v{r.version}
                        </span>
                        <Badge variant="outline">build {r.versionCode}</Badge>
                        {r.isLatest && (
                          <Badge className="bg-success/15 text-success-foreground border-success/40">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            latest
                          </Badge>
                        )}
                        {r.minVersion && (
                          <Badge variant="outline" className="text-xs">
                            min {r.minVersion}
                          </Badge>
                        )}
                      </div>
                      {r.notes && (
                        <p className="text-muted-foreground mt-1 text-sm">
                          {r.notes}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-2 text-xs">
                        Publicada{" "}
                        {new Intl.DateTimeFormat("es-CL", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(r.publishedAt))}
                        {" · "}
                        <a
                          href={r.apkUrl}
                          target="_blank"
                          rel="noopener"
                          className="underline hover:no-underline"
                        >
                          descargar APK ↗
                        </a>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!r.isLatest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleMarcarLatest(r.id, r.version)
                          }
                        >
                          <Star className="mr-1 h-4 w-4" />
                          Marcar latest
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(r)}
                        disabled={r.isLatest}
                        title={
                          r.isLatest
                            ? "No se puede eliminar el latest. Marca otra primero."
                            : "Eliminar release"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Eliminar release v${deleting?.version}`}
        description="Esta acción borra el archivo APK del servidor + la fila de DB. No se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleEliminar}
      />
    </div>
  );
}
