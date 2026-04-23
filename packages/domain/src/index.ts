/**
 * @repo/domain — lógica de negocio compartida entre apps/web y apps/mobile.
 *
 * Pure TS. Sin dependencias de React, Next.js, ni entorno Node-only.
 * Corre en browser, Node SSR, React Native, Edge runtime.
 *
 * Ver gotcha G-M11 en memory/projects/pos-chile-mobile.md —
 * apps/web/lib/utils.ts re-exporta de acá para preservar compat API.
 */

export { formatCLP } from "./formatCLP";
export { calcularIVA } from "./calcularIVA";
export { calcularDesglose, type DesgloseVenta } from "./calcularDesglose";
export { validarRUT } from "./validarRUT";
export { formatRUT } from "./formatRUT";
