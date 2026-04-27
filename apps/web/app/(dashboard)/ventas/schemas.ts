// Schemas Zod compartibles entre server actions y route handlers.
// IMPORTANTE: este archivo no es "use server" — los archivos de server actions
// solo pueden exportar funciones async, así que cualquier z.object() vivo se
// declara aquí.

import { z } from "zod";
import { MetodoPago } from "@repo/db";

// F-9 split tender. MIXTO no es válido en un pago individual — solo es el
// cache que queda en Venta.metodoPago cuando hay >1 pago.
export const pagoSchema = z.object({
  metodo: z.nativeEnum(MetodoPago).refine((v) => v !== MetodoPago.MIXTO, {
    message: "MIXTO no es válido como método de un pago individual",
  }),
  monto: z.number().int().positive("Monto debe ser positivo"),
  referencia: z.string().max(100).optional(),
});

export type PagoInput = z.infer<typeof pagoSchema>;
