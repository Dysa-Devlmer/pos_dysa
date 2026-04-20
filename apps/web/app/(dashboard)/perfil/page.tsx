import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, Receipt, UserCircle2 } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { ActividadReciente } from "./actividad-reciente";
import { AvatarCard } from "./avatar-card";
import { DatosForm } from "./datos-form";
import { PasswordForm } from "./password-form";
import { PerfilContainer, PerfilItem } from "./page-animations";
import { obtenerPerfil } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const res = await obtenerPerfil();
  if (!res.ok) {
    redirect("/login");
  }
  const perfil = res.data!;

  return (
    <PerfilContainer>
      <PerfilItem>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Administra tu información personal, seguridad y revisa tu actividad.
          </p>
        </div>
      </PerfilItem>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <PerfilItem>
          <AvatarCard
            nombre={perfil.nombre}
            email={perfil.email}
            rol={perfil.rol}
            avatarInicial={perfil.avatar}
            createdAt={perfil.createdAt.toISOString()}
          />
        </PerfilItem>

        <PerfilItem>
          <Tabs defaultValue="datos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="datos">
                <UserCircle2 className="size-4" />
                <span className="hidden sm:inline">Datos personales</span>
                <span className="sm:hidden">Datos</span>
              </TabsTrigger>
              <TabsTrigger value="seguridad">
                <KeyRound className="size-4" />
                <span className="hidden sm:inline">Seguridad</span>
                <span className="sm:hidden">Seguridad</span>
              </TabsTrigger>
              <TabsTrigger value="actividad">
                <Receipt className="size-4" />
                <span className="hidden sm:inline">Mi actividad</span>
                <span className="sm:hidden">Actividad</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="datos" className="mt-4">
              <DatosForm
                nombre={perfil.nombre}
                email={perfil.email}
                rol={perfil.rol}
              />
            </TabsContent>

            <TabsContent value="seguridad" className="mt-4">
              <PasswordForm />
            </TabsContent>

            <TabsContent value="actividad" className="mt-4">
              <ActividadReciente usuarioId={perfil.id} />
            </TabsContent>
          </Tabs>
        </PerfilItem>
      </div>
    </PerfilContainer>
  );
}
