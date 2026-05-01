/**
 * Mobile contract test — Idempotency-Key en flushSyncQueue (Fase 2B-P0).
 *
 * Verifica que `flushSyncQueue` envía `Idempotency-Key: <row.id>` al
 * `apiClient.post`, y que en un retry de la misma fila la key se reutiliza.
 *
 * Esto cierra el lazo P0 entre mobile y server: sin este header, el server
 * no puede deduplicar; sin reutilizar la misma key en retries, el dedupe
 * se pierde.
 *
 * Estrategia de mock:
 *   - `@/db/client.getDb` retorna un fake con métodos chainable que
 *     producen `Promise.resolve(rowsList)` para `select`, y no-ops para
 *     `update`/`delete`. Sin tocar SQLite real.
 *   - `@/db/schema` exporta los símbolos como objetos placeholder.
 *   - `@/stores/authStore.apiClient.post` capturado con `jest.fn`.
 *   - `nanoid/non-secure` mockeado (ESM puro no transformado por jest).
 */

import { ApiClientError, CrearVentaRequestSchema } from "@repo/api-client";

import { apiClient } from "../stores/authStore";

import { flushSyncQueue } from "../db/sync";

jest.mock("nanoid/non-secure", () => ({
  nanoid: () => "mocked-nanoid",
}));

// Mock @repo/api-client a nivel `createApiClient` — el authStore real luego
// instancia un cliente cuyos `post/get/setToken` son jest.fn() controlables
// desde el test. Patrón usado en authStore.test.ts (estable con jest-expo).
jest.mock("@repo/api-client", () => {
  const actual = jest.requireActual("@repo/api-client");
  return {
    ...actual,
    createApiClient: jest.fn(() => ({
      post: jest.fn(),
      get: jest.fn(),
      setToken: jest.fn(),
    })),
  };
});

const mockApiPost = apiClient.post as jest.MockedFunction<
  typeof apiClient.post
>;

// Estado mutable que el fake db lee/modifica.
type Row = {
  id: string;
  payload: string;
  status: string;
  intentos: number;
  error: string | null;
  creadaAt: Date;
  lastAttemptAt: Date | null;
};

const queueState: { rows: Row[] } = { rows: [] };

/**
 * Builder thenable que ignora `from/where/orderBy` y retorna el snapshot
 * actual de queueState.rows que matchea status="pending". Es lo que
 * `flushSyncQueue` necesita.
 */
// Helper que produce un objeto chainable con thenable wrap async para que
// `await` resuelva al valor producido por `compute()`. El wrap async es
// necesario: Promise.resolve hace then-hijacking que si llamamos onFulfill
// síncrono pierde el valor en algunos runtimes.
function makeChainable<T>(
  methods: string[],
  compute: () => T,
): Record<string, unknown> & PromiseLike<T> {
  const obj: Record<string, unknown> = {};
  for (const m of methods) {
    obj[m] = () => obj;
  }
  obj.then = (onFulfill: (v: T) => unknown, onReject?: (e: unknown) => unknown) => {
    return Promise.resolve()
      .then(() => compute())
      .then(onFulfill, onReject);
  };
  return obj as Record<string, unknown> & PromiseLike<T>;
}

function makeSelectBuilder() {
  return makeChainable<Row[]>(
    ["from", "where", "orderBy"],
    () => queueState.rows.filter((r) => r.status === "pending"),
  );
}

function makeUpdateBuilder() {
  return makeChainable<void>(["set", "where"], () => undefined);
}

function makeDeleteBuilder() {
  return makeChainable<void>(["where"], () => undefined);
}

const fakeDb = {
  select: makeSelectBuilder,
  update: makeUpdateBuilder,
  delete: makeDeleteBuilder,
};

jest.mock("@/db/client", () => ({
  getDb: jest.fn().mockResolvedValue(fakeDb),
}));

jest.mock("@/db/schema", () => ({
  syncQueue: { id: "id", status: "status", creadaAt: "creadaAt" },
  syncMeta: { id: "id" },
  productosCache: { id: "id" },
}));

beforeEach(() => {
  mockApiPost.mockReset();
  queueState.rows = [];
});

describe("flushSyncQueue — Idempotency-Key (Fase 2B-P0)", () => {
  test("envía Idempotency-Key = row.id al POST /api/v1/ventas", async () => {
    queueState.rows.push({
      id: "nano-IDX1",
      payload: JSON.stringify({
        items: [{ productoId: 1, cantidad: 1 }],
        metodoPago: "EFECTIVO",
      }),
      status: "pending",
      intentos: 0,
      error: null,
      creadaAt: new Date(),
      lastAttemptAt: null,
    });

    mockApiPost.mockResolvedValueOnce({
      data: {
        id: 1,
        numeroBoleta: "BOL-1",
        subtotal: 5000,
        impuesto: 950,
        total: 5950,
        metodoPago: "EFECTIVO",
      },
    });

    // sanity check: el schema de envelope acepta el payload mínimo
    expect(
      CrearVentaRequestSchema.safeParse({
        items: [{ productoId: 1, cantidad: 1 }],
        metodoPago: "EFECTIVO",
      }).success,
    ).toBe(true);

    await flushSyncQueue();

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    const callArgs = mockApiPost.mock.calls[0]!;
    // Args: (path, payload, schema, opts)
    expect(callArgs[0]).toBe("/api/v1/ventas");
    expect(callArgs[3]).toEqual({
      headers: { "Idempotency-Key": "nano-IDX1" },
    });
  });

  test("retry de la misma fila reutiliza la misma key", async () => {
    queueState.rows.push({
      id: "nano-RETRY7",
      payload: JSON.stringify({
        items: [{ productoId: 1, cantidad: 1 }],
        metodoPago: "EFECTIVO",
      }),
      status: "pending",
      intentos: 0,
      error: null,
      creadaAt: new Date(),
      lastAttemptAt: null,
    });

    // Primer intento: el server falla con 503 — fila queda pending.
    mockApiPost.mockRejectedValueOnce(
      new ApiClientError("Service Unavailable", 503),
    );

    await flushSyncQueue();
    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockApiPost.mock.calls[0]![3]).toEqual({
      headers: { "Idempotency-Key": "nano-RETRY7" },
    });

    // Segundo intento: server responde 200. La key DEBE ser la misma.
    mockApiPost.mockResolvedValueOnce({
      data: {
        id: 7,
        numeroBoleta: "BOL-7",
        subtotal: 5000,
        impuesto: 950,
        total: 5950,
        metodoPago: "EFECTIVO",
      },
    });

    await flushSyncQueue();
    expect(mockApiPost).toHaveBeenCalledTimes(2);
    expect(mockApiPost.mock.calls[1]![3]).toEqual({
      headers: { "Idempotency-Key": "nano-RETRY7" },
    });
  });
});
