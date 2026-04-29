/**
 * Jest config — POS Chile mobile.
 *
 * Preset `jest-expo` configura Babel para manejar:
 *   - JSX/TSX (via babel-preset-expo)
 *   - Native modules (mocks automáticos para expo-* + react-native)
 *   - Module resolution con alias `@/...` (matchea tsconfig)
 *   - Hermes bytecode skip (tests corren en Node, no Hermes)
 *
 * Día 5 setup (audit Claude Code CLI 2026-04-28):
 * Antes de esta config los 3 tests existentes (cartStore, validarRUT,
 * version) eran letra muerta — Jest no estaba instalado, `tsc --noEmit`
 * fallaba en `apps/mobile` por nombres `describe`, `test`, `expect`,
 * `beforeEach` no resueltos. Con jest-expo + @types/jest los tests:
 *   1. Compilan tipos (TS2304 cleared)
 *   2. Ejecutan en `pnpm --filter @repo/mobile test`
 *   3. Generan coverage en CI (`test:ci`)
 *
 * Coverage threshold: por ahora 0 (cobertura mobile real ~5%); subir
 * progresivamente a medida que Día 5 + sprints F-13/F-6 escriben tests
 * sobre syncStore, authStore, db/sync.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",

  // Patrón de archivos de test. Por convención los tests viven en:
  //   - `__tests__/*.test.ts(x)`  (carpeta dedicada, recomendado RN)
  //   - `*.test.ts(x)` colocated junto al archivo bajo test (futuro)
  testMatch: [
    "**/__tests__/**/*.test.{ts,tsx}",
    "**/*.test.{ts,tsx}",
  ],

  // Excluir build outputs y node_modules para que jest no escanee MB de
  // archivos generados.
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.expo/",
    "/android/",
    "/ios/",
    "/dist/",
  ],

  // jest-expo ya instala mocks de expo-* + react-native; agregamos solo
  // setup específico del proyecto (ej. react-native-reanimated requiere
  // un mock manual al inicio de cada test).
  setupFiles: ["./jest.setup.js"],

  // Resolver alias `@/...` consistente con `tsconfig.json` paths.
  // jest-expo no auto-detecta tsconfig paths como Vitest, hay que
  // declararlo explícito.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  // jest-expo trae transformers para JS/TS/JSX/TSX vía Babel. Solo
  // declaramos los archivos que NO debe transformar (pesados o ya
  // pre-built).
  //
  // pnpm wrinkle: las deps reales viven en
  // `node_modules/.pnpm/<pkg>@<ver>_<hash>/node_modules/<pkg>/...`
  // El primer `.*?node_modules/` opcional matchea ese prefijo .pnpm
  // para que el regex también acierte con el path "real" del paquete.
  // Sin esto, `react-native/jest/setup.js` falla con
  // `SyntaxError: Cannot use import statement outside a module` porque
  // jest no lo transforma.
  transformIgnorePatterns: [
    "node_modules/(?!(?:.*?node_modules/)?(?:(?:jest-)?react-native[\\w-]*|@react-native[\\w-]*|expo[\\w-]*|@expo[\\w-]*|@expo-google-fonts[\\w-]*|react-navigation|@react-navigation[\\w-]*|@unimodules[\\w-]*|unimodules|sentry-expo|native-base|nativewind|@tanstack[\\w-]*|@sentry[\\w-]*|drizzle-orm)/)",
  ],

  // Coverage settings para CI. Por ahora threshold 0 — escalar
  // según escribamos tests reales (objetivo: 60% líneas en core
  // mobile post-F6).
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "stores/**/*.{ts,tsx}",
    "db/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/__tests__/**",
    "!**/__mocks__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};
