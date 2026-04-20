"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────
// SVG illustrations — simples, usan currentColor + accentColor (primary).
// Escalables por viewBox, sin dependencias externas.
// ──────────────────────────────────────────────────────────────────────────

export type EmptyIllustration =
  | "box"
  | "cart"
  | "chart"
  | "users"
  | "receipt"
  | "inbox"
  | "search";

function Box(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 120" fill="none" {...props}>
      <defs>
        <linearGradient id="box-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="102" rx="52" ry="6" fill="currentColor" fillOpacity="0.08" />
      <path
        d="M36 52 L80 34 L124 52 L124 92 L80 110 L36 92 Z"
        fill="url(#box-grad)"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M36 52 L80 70 L124 52" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M80 70 L80 110" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M58 43 L102 43" stroke="var(--primary)" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Cart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 120" fill="none" {...props}>
      <ellipse cx="80" cy="108" rx="48" ry="5" fill="currentColor" fillOpacity="0.08" />
      <path
        d="M30 34 L44 34 L60 82 L116 82"
        stroke="currentColor"
        strokeOpacity="0.65"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 50 L128 50 L118 76 L58 76 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeOpacity="0.65"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="68" cy="96" r="5" fill="var(--primary)" fillOpacity="0.9" />
      <circle cx="110" cy="96" r="5" fill="var(--primary)" fillOpacity="0.9" />
    </svg>
  );
}

function Chart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 120" fill="none" {...props}>
      <ellipse cx="80" cy="108" rx="48" ry="5" fill="currentColor" fillOpacity="0.08" />
      <rect x="28" y="70" width="18" height="32" rx="3" fill="currentColor" fillOpacity="0.15" />
      <rect x="54" y="54" width="18" height="48" rx="3" fill="currentColor" fillOpacity="0.15" />
      <rect x="80" y="38" width="18" height="64" rx="3" fill="var(--primary)" fillOpacity="0.35" />
      <rect x="106" y="60" width="18" height="42" rx="3" fill="currentColor" fillOpacity="0.15" />
      <path
        d="M30 62 Q56 50, 68 40 T132 22"
        stroke="var(--primary)"
        strokeOpacity="0.8"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 120" fill="none" {...props}>
      <ellipse cx="80" cy="106" rx="52" ry="6" fill="currentColor" fillOpacity="0.08" />
      <circle cx="62" cy="56" r="14" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
      <path
        d="M40 96 Q40 78, 62 78 T84 96"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <circle cx="102" cy="52" r="12" fill="var(--primary)" fillOpacity="0.2" stroke="var(--primary)" strokeOpacity="0.7" strokeWidth="1.5" />
      <path
        d="M84 92 Q84 76, 102 76 T120 92"
        fill="var(--primary)"
        fillOpacity="0.15"
        stroke="var(--primary)"
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function Receipt(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 120" fill="none" {...props}>
      <ellipse cx="80" cy="108" rx="46" ry="5" fill="currentColor" fillOpacity="0.08" />
      <path
        d="M50 18 L110 18 L110 104 L102 98 L94 104 L86 98 L78 104 L70 98 L62 104 L54 98 L50 104 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M62 36 L98 36" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M62 50 L98 50" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M62 64 L88 64" stroke="var(--primary)" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="98" cy="78" r="4" fill="var(--primary)" fillOpacity="0.9" />
    </svg>
  );
}

function Inbox(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 120" fill="none" {...props}>
      <ellipse cx="80" cy="108" rx="48" ry="5" fill="currentColor" fillOpacity="0.08" />
      <path
        d="M34 40 L50 22 L110 22 L126 40 L126 92 L34 92 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M34 62 L58 62 L66 72 L94 72 L102 62 L126 62"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 120" fill="none" {...props}>
      <ellipse cx="80" cy="108" rx="44" ry="5" fill="currentColor" fillOpacity="0.08" />
      <circle cx="68" cy="54" r="26" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.75" />
      <path d="M88 74 L108 94" stroke="var(--primary)" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<EmptyIllustration, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  box: Box,
  cart: Cart,
  chart: Chart,
  users: Users,
  receipt: Receipt,
  inbox: Inbox,
  search: Search,
};

// ──────────────────────────────────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  illustration?: EmptyIllustration;
  /** Título descriptivo (ej. "Aún no hay productos"). */
  title: string;
  /** Subtítulo/descripción accionable (1-2 líneas). */
  description?: string;
  /** Texto del CTA primario. */
  ctaLabel?: string;
  /** Href del CTA (si es link). */
  ctaHref?: string;
  /** Handler del CTA (si es acción, p.ej. abrir modal). Ignora ctaHref. */
  ctaOnClick?: () => void;
  className?: string;
}

export function EmptyState({
  illustration = "inbox",
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  className,
}: EmptyStateProps) {
  const Illu = ILLUSTRATIONS[illustration];

  const ctaNode = ctaLabel ? (
    ctaOnClick ? (
      <Button type="button" onClick={ctaOnClick} className="mt-1">
        {ctaLabel}
      </Button>
    ) : ctaHref ? (
      <Button asChild className="mt-1">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    ) : null
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center",
        className,
      )}
    >
      <Illu className="size-28 text-muted-foreground" />
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {ctaNode}
    </motion.div>
  );
}
