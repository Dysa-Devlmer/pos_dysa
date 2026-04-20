// Flat config (ESLint 9) — reemplaza `next lint` deprecado.
// Usa FlatCompat para cargar el preset clásico `next/core-web-vitals`
// sin tener que duplicar reglas manualmente.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "**/*.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Permitimos `any` puntual en lugares de interop tipado (Recharts, etc).
      "@typescript-eslint/no-explicit-any": "warn",
      // Evita ruido en Server Actions que reciben FormData.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
