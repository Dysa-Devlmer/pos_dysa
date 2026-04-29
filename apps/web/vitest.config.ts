import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "__tests__/**/*.test.ts",
      "lib/__tests__/**/*.test.ts",
      "app/**/__tests__/**/*.test.ts",
    ],
    globals: false,
    // F-6 (audit Claude Code CLI 2026-04-28): setup global con Prisma
    // mock + auth() mock + next/cache mock. Cualquier suite que tester
    // server actions debe importar `prismaMock`, `authMock`,
    // `mockSession`, `resetMocks` desde `@/test/setup`.
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
