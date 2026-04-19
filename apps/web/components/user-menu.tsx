"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut, UserCircle2, ChevronDown } from "lucide-react";
import type { Rol } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { gradientePorNombre, inicialesDe } from "@/lib/avatar";
import { ROL_BADGE } from "@/lib/badge-styles";

export interface UserMenuProps {
  nombre: string;
  email: string;
  rol: Rol;
  avatar: string | null;
  /** Server Action envuelta en <form action> por el server component padre. */
  signOutForm: React.ReactNode;
}

export function UserMenu({
  nombre,
  email,
  rol,
  avatar,
  signOutForm,
}: UserMenuProps) {
  const iniciales = inicialesDe(nombre);
  const gradient = gradientePorNombre(nombre);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex items-center gap-2 rounded-md px-1.5 py-1 text-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Menú de usuario"
      >
        <div className="relative size-8 overflow-hidden rounded-full ring-1 ring-border">
          {avatar ? (
            <Image
              src={avatar}
              alt={nombre}
              fill
              sizes="32px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient} text-[11px] font-semibold text-white`}
            >
              {iniciales}
            </div>
          )}
        </div>
        <div className="hidden flex-col items-start leading-tight sm:flex">
          <span className="font-medium">{nombre}</span>
          <span className="text-[10px] text-muted-foreground">{email}</span>
        </div>
        <ChevronDown className="size-4 text-muted-foreground transition group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <div className="relative size-10 overflow-hidden rounded-full ring-1 ring-border">
            {avatar ? (
              <Image
                src={avatar}
                alt={nombre}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient} text-sm font-semibold text-white`}
              >
                {iniciales}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <Badge variant="outline" className={`mt-1 text-[10px] ${ROL_BADGE[rol]}`}>
              {rol}
            </Badge>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/perfil" className="cursor-pointer">
            <UserCircle2 className="size-4" />
            Mi Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="cursor-pointer text-destructive focus:text-destructive">
          <div className="w-full">{signOutForm}</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Botón/form interno usado dentro del DropdownMenuItem para signOut. */
export function SignOutInline() {
  return (
    <button
      type="submit"
      className="flex w-full items-center gap-2 text-sm"
    >
      <LogOut className="size-4" />
      Cerrar sesión
    </button>
  );
}
