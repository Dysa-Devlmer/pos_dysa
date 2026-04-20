"use client";

import * as React from "react";
import { animate, useInView, useMotionValue } from "framer-motion";

export interface CounterUpProps {
  /** Valor final a mostrar. */
  value: number;
  /** Duración de la animación en segundos. Default: 1.2s */
  duration?: number;
  /** Función de formato. Recibe el número interpolado y devuelve string. */
  format?: (v: number) => string;
  /** Clases CSS aplicadas al <span>. */
  className?: string;
}

/**
 * Número animado que interpola desde 0 (o desde el valor previo) hasta `value`
 * cuando entra en viewport. Respeta prefers-reduced-motion: si el usuario
 * prefiere menos animación, muestra el valor final directo.
 */
export function CounterUp({
  value,
  duration = 1.2,
  format = (v) => Math.round(v).toLocaleString("es-CL"),
  className,
}: CounterUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const [rendered, setRendered] = React.useState<string>(format(0));
  const prevValueRef = React.useRef(0);

  // Respeta reduce-motion
  const prefersReduced = React.useRef(false);
  React.useEffect(() => {
    prefersReduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  React.useEffect(() => {
    if (!inView) return;

    if (prefersReduced.current) {
      setRendered(format(value));
      prevValueRef.current = value;
      return;
    }

    const controls = animate(prevValueRef.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // ease-out expo suave
      onUpdate(latest) {
        motionValue.set(latest);
        setRendered(format(latest));
      },
      onComplete() {
        prevValueRef.current = value;
      },
    });

    return () => controls.stop();
  }, [inView, value, duration, format, motionValue]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {rendered}
    </span>
  );
}
