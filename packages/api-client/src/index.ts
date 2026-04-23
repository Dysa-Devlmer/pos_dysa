/**
 * @repo/api-client — fetch client tipado con Zod compartido entre web/mobile.
 *
 * Pure TS. Sin deps de React, Next.js, ni libs nativas. Corre en cualquier
 * runtime con `fetch` global (browser, Node 18+, Edge, React Native).
 *
 * Subpath exports:
 * - `@repo/api-client`        → createApiClient, ApiClientError, types
 * - `@repo/api-client/types`  → solo Zod schemas (útil para server handlers)
 */

export { createApiClient, ApiClientError } from "./client";
export type { ApiClient, ApiClientConfig } from "./client";

export * from "./types";
