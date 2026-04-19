"use client";

import * as React from "react";
import Link from "next/link";

import { Button, type buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

export type IconButtonTone = "neutral" | "destructive" | "primary";

const TONE_CLASSES: Record<IconButtonTone, string> = {
  neutral:
    "text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-110 transition-all",
  destructive:
    "text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:scale-110 transition-all",
  primary:
    "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-110 transition-all",
};

type ButtonSize = VariantProps<typeof buttonVariants>["size"];

interface BaseProps {
  /** Texto mostrado en el tooltip y como aria-label. Obligatorio para accesibilidad. */
  label: string;
  /** Icono a renderizar (ej. <Pencil className="size-4" />). */
  children: React.ReactNode;
  /** Tono visual — neutral para editar/ver, destructive para eliminar. */
  tone?: IconButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
}

interface AsButton extends BaseProps {
  href?: undefined;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
}

interface AsLink extends BaseProps {
  href: string;
  onClick?: undefined;
  type?: undefined;
}

export type IconButtonProps = AsButton | AsLink;

export function IconButton({
  label,
  children,
  tone = "neutral",
  size = "icon-sm",
  disabled,
  className,
  ...rest
}: IconButtonProps) {
  const buttonClass = cn(TONE_CLASSES[tone], className);

  const inner =
    "href" in rest && rest.href !== undefined ? (
      <Button
        asChild
        variant="ghost"
        size={size}
        disabled={disabled}
        aria-label={label}
        className={buttonClass}
      >
        <Link href={rest.href}>{children}</Link>
      </Button>
    ) : (
      <Button
        type={("type" in rest && rest.type) || "button"}
        variant="ghost"
        size={size}
        disabled={disabled}
        aria-label={label}
        className={buttonClass}
        onClick={"onClick" in rest ? rest.onClick : undefined}
      >
        {children}
      </Button>
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
