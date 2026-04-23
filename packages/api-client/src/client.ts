import { z } from "zod";
import { ApiErrorSchema } from "./types";

/**
 * API Client tipado para POS Chile v1.
 * Compatible con web (edge/node runtime) y mobile (React Native fetch).
 *
 * Arquitectura:
 * - Base URL inyectada desde env (EXPO_PUBLIC_API_URL en mobile,
 *   relative en web SSR/client).
 * - Bearer token opcional vía setToken().
 * - Validación Zod de responses. Si el shape difiere del schema,
 *   el client lanza un error detallado (no silent data corruption).
 *
 * Uso típico (mobile):
 *   const api = createApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL });
 *   api.setToken(jwtFromSecureStore);
 *   const { data } = await api.get("/api/v1/productos", ProductosListSchema);
 */

export type ApiClientConfig = {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  /** Timeout por request en ms. Default 30s. */
  timeoutMs?: number;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(config: ApiClientConfig) {
  let authToken: string | null = null;
  const timeoutMs = config.timeoutMs ?? 30_000;

  function setToken(token: string | null): void {
    authToken = token;
  }

  function getToken(): string | null {
    return authToken;
  }

  async function request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: {
      body?: unknown;
      schema: z.ZodType<T>;
      query?: Record<string, string | number | undefined>;
    },
  ): Promise<T> {
    const url = new URL(path, config.baseUrl);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...config.defaultHeaders,
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new ApiClientError(
        `Network error calling ${method} ${path}: ${cause}`,
        0,
      );
    } finally {
      clearTimeout(timeoutHandle);
    }

    const rawText = await response.text();
    let parsedBody: unknown = undefined;
    if (rawText.length > 0) {
      try {
        parsedBody = JSON.parse(rawText);
      } catch {
        throw new ApiClientError(
          `Response body de ${method} ${path} no es JSON válido`,
          response.status,
          rawText,
        );
      }
    }

    if (!response.ok) {
      const errorMessage =
        ApiErrorSchema.safeParse(parsedBody).data?.error ??
        `HTTP ${response.status}`;
      throw new ApiClientError(errorMessage, response.status, parsedBody);
    }

    const validated = options.schema.safeParse(parsedBody);
    if (!validated.success) {
      throw new ApiClientError(
        `Response shape inválido de ${method} ${path}: ${validated.error.message}`,
        response.status,
        parsedBody,
      );
    }

    return validated.data;
  }

  return {
    setToken,
    getToken,

    get<T>(
      path: string,
      schema: z.ZodType<T>,
      query?: Record<string, string | number | undefined>,
    ): Promise<T> {
      return request("GET", path, { schema, query });
    },

    post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
      return request("POST", path, { body, schema });
    },

    patch<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
      return request("PATCH", path, { body, schema });
    },

    delete<T>(path: string, schema: z.ZodType<T>): Promise<T> {
      return request("DELETE", path, { schema });
    },
  };
}
