/**
 * Tailwind config para mobile (NativeWind v4 usa Tailwind v3 syntax).
 * Paleta SystemQR portada del web (globals.css oklch → hex aproximados).
 *
 * Tokens principales:
 * - primary: naranja #f97316 (hero SystemQR)
 * - success: emerald #10b981
 * - warning: amber #f59e0b
 * - destructive: red #ef4444
 * - background light: ivory #f5f1ea
 * - background dark: near-black #0a0a0a
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  // 2026-04-28 — `important: "html"` REMOVIDO (gotcha G-M36 obsoleto).
  //
  // 2026-04-28 (M0.5) — `darkMode` simplificado a `"class"`. La forma
  // `["class", "[data-theme='dark']"]` hacía que `nativewind/preset` emitiera
  // la directiva `@cssInterop set darkMode attribute data-theme='dark';` en el
  // CSS generado. Esa directiva es API de NativeWind 4.2.x y solo la entiende
  // `react-native-css-interop@0.2.x`; sin embargo `nativewind@4.1.23` (la versión
  // que pinneamos para evitar el bug de css-interop@0.2.3) declara dep en
  // `css-interop@0.1.22`, cuyo `lightningcss` revienta con
  // `SyntaxError: Unexpected token Ident("set")` al toparse con `@cssInterop`.
  // Mismatch de packaging upstream — ver gotcha G-M43.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paleta SystemQR (sincronizada con apps/web/app/globals.css)
        border: "#e4decf",           // ivory-300
        input: "#ebe6db",
        ring: "#f97316",             // orange-500
        background: "#f5f1ea",       // ivory
        foreground: "#171717",       // near-black

        primary: {
          DEFAULT: "#f97316",        // orange-500
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f1ecdf",        // ivory-200
          foreground: "#171717",
        },
        destructive: {
          DEFAULT: "#ef4444",        // red-500
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#ede8db",
          foreground: "#737373",
        },
        accent: {
          DEFAULT: "#fef3c7",        // amber-100
          foreground: "#92400e",     // amber-800
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#171717",
        },

        // Tokens POS custom
        success: {
          DEFAULT: "#10b981",        // emerald-500
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",        // amber-500
          foreground: "#171717",
        },

        // Chart palette (para Victory Native en M3)
        "chart-1": "#f97316",
        "chart-2": "#f59e0b",
        "chart-3": "#10b981",
        "chart-4": "#fb7185",
        "chart-5": "#8b5cf6",
      },
      borderRadius: {
        lg: "12px",  // --radius: 0.75rem del web
        md: "10px",
        sm: "8px",
      },
    },
  },
  plugins: [],
};
