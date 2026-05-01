/**
 * Unit tests — CSV import productos (Fase 3A · 2026-05-01).
 *
 * Cubre:
 *   - parsePrecioChileno: formatos válidos / rechazados.
 *   - parseBoolEs: si/no/true/false/1/0.
 *   - parseCsvText: BOM, CRLF, quotes, delimiter `,` y `;`, filas vacías.
 *   - parseRowsToProductos: header validation, tipos, ranges.
 *   - previewImportProductos: file size, row count, categorías inexistentes,
 *     duplicados intra-CSV, duplicados en DB.
 *   - commitImportProductos: bulk insert, update existentes, skip,
 *     transacción + AuditLog.
 *
 * Decisiones aprobadas Pierre 2026-05-01: ver import-actions.ts header.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";

import {
  buildCsvTemplate,
  CSV_TEMPLATE_HEADERS,
  parseBoolEs,
  parseCsvText,
  parsePrecioChileno,
  parseRowsToProductos,
  MAX_FILE_SIZE,
  MAX_ROWS,
} from "../import-helpers";

import {
  previewImportProductos,
  commitImportProductos,
} from "../import-actions";

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });
});

// ─── parsePrecioChileno ────────────────────────────────────────────────────

describe("parsePrecioChileno — UX flexible CL", () => {
  test("acepta entero plano", () => {
    expect(parsePrecioChileno("1990")).toBe(1990);
  });

  test("acepta separador de miles con punto", () => {
    expect(parsePrecioChileno("1.990")).toBe(1990);
    expect(parsePrecioChileno("1.990.000")).toBe(1990000);
  });

  test("acepta prefijo $", () => {
    expect(parsePrecioChileno("$1.990")).toBe(1990);
    expect(parsePrecioChileno("$ 1.990")).toBe(1990);
    expect(parsePrecioChileno("$1990")).toBe(1990);
  });

  test("acepta whitespace", () => {
    expect(parsePrecioChileno("  1990  ")).toBe(1990);
  });

  test("RECHAZA decimales con coma", () => {
    expect(parsePrecioChileno("1990,50")).toBeNull();
    expect(parsePrecioChileno("1.990,50")).toBeNull();
  });

  test("RECHAZA decimales con punto al final", () => {
    expect(parsePrecioChileno("1990.5")).toBeNull();
    expect(parsePrecioChileno("1990.50")).toBeNull();
  });

  test("RECHAZA strings no numéricos", () => {
    expect(parsePrecioChileno("abc")).toBeNull();
    expect(parsePrecioChileno("")).toBeNull();
    expect(parsePrecioChileno("$$")).toBeNull();
  });
});

// ─── parseBoolEs ───────────────────────────────────────────────────────────

describe("parseBoolEs — booleanos es-CL", () => {
  test("vacío → true (default activo)", () => {
    expect(parseBoolEs("")).toBe(true);
  });
  test("acepta si/sí/true/1", () => {
    expect(parseBoolEs("si")).toBe(true);
    expect(parseBoolEs("sí")).toBe(true);
    expect(parseBoolEs("true")).toBe(true);
    expect(parseBoolEs("1")).toBe(true);
    expect(parseBoolEs("SI")).toBe(true);
  });
  test("acepta no/false/0", () => {
    expect(parseBoolEs("no")).toBe(false);
    expect(parseBoolEs("false")).toBe(false);
    expect(parseBoolEs("0")).toBe(false);
  });
  test("rechaza valores raros", () => {
    expect(parseBoolEs("maybe")).toBeNull();
    expect(parseBoolEs("2")).toBeNull();
  });
});

// ─── parseCsvText ──────────────────────────────────────────────────────────

describe("parseCsvText — parser CSV", () => {
  test("delimiter coma con header simple", () => {
    const { delimiter, headers, rows } = parseCsvText(
      "nombre,codigoBarras\nA,X\nB,Y\n",
    );
    expect(delimiter).toBe(",");
    expect(headers).toEqual(["nombre", "codigobarras"]);
    expect(rows).toEqual([
      ["A", "X"],
      ["B", "Y"],
    ]);
  });

  test("delimiter punto y coma (Excel es-CL)", () => {
    const { delimiter, headers, rows } = parseCsvText(
      "nombre;precio\nCoca;1990\n",
    );
    expect(delimiter).toBe(";");
    expect(headers).toEqual(["nombre", "precio"]);
    expect(rows).toEqual([["Coca", "1990"]]);
  });

  test("strip BOM UTF-8", () => {
    const bom = "﻿";
    const { headers } = parseCsvText(`${bom}nombre,precio\nA,1\n`);
    expect(headers).toEqual(["nombre", "precio"]);
  });

  test("respeta quotes con coma interna", () => {
    const { rows } = parseCsvText(
      `nombre,descripcion\n"Coca, 1.5L","Bebida, gaseosa"\n`,
    );
    expect(rows[0]).toEqual(["Coca, 1.5L", "Bebida, gaseosa"]);
  });

  test("respeta quotes escapadas (\"\")", () => {
    const { rows } = parseCsvText(`nombre\n"Pan ""premium""""\n`);
    expect(rows[0]?.[0]).toContain('Pan "premium"');
  });

  test("normaliza CRLF, CR, LF", () => {
    const { rows } = parseCsvText("a,b\r\nx,y\rz,w\n1,2\n");
    expect(rows.length).toBe(3);
  });

  test("ignora filas completamente vacías", () => {
    const { rows } = parseCsvText("a,b\n\nA,B\n\n");
    expect(rows).toEqual([["A", "B"]]);
  });
});

// ─── parseRowsToProductos ──────────────────────────────────────────────────

describe("parseRowsToProductos — header + types validation", () => {
  test("falla si falta header obligatorio", () => {
    const { errors } = parseRowsToProductos(["nombre", "precio"], []);
    expect(errors.some((e) => e.row === 0 && /codigobarras/i.test(e.message))).toBe(true);
    expect(errors.some((e) => e.row === 0 && /categoria/i.test(e.message))).toBe(true);
  });

  test("happy path con columnas opcionales por default", () => {
    const headers = ["nombre", "codigobarras", "precio", "categoria"];
    const rows = [["Coca-Cola 1.5L", "7800001", "1990", "Bebidas"]];
    const { parsed, errors } = parseRowsToProductos(headers, rows);
    expect(errors).toEqual([]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      nombre: "Coca-Cola 1.5L",
      codigoBarras: "7800001",
      precio: 1990,
      stock: 0,
      alertaStock: 5,
      categoriaNombre: "Bebidas",
      activo: true,
    });
  });

  test("error específico por fila para precio inválido", () => {
    const headers = ["nombre", "codigobarras", "precio", "categoria"];
    const rows = [["Coca", "C123", "1990,50", "Bebidas"]];
    const { errors, parsed } = parseRowsToProductos(headers, rows);
    expect(parsed).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ row: 1, field: "precio" });
  });

  test("error si precio fuera de rango (>99M)", () => {
    const headers = ["nombre", "codigobarras", "precio", "categoria"];
    const rows = [["X", "C1", "100000000", "Bebidas"]];
    const { errors } = parseRowsToProductos(headers, rows);
    expect(errors.some((e) => e.field === "precio" && /rango/i.test(e.message))).toBe(true);
  });

  test("error si nombre < 2 chars", () => {
    const headers = ["nombre", "codigobarras", "precio", "categoria"];
    const rows = [["A", "C1", "1990", "Bebidas"]];
    const { errors } = parseRowsToProductos(headers, rows);
    expect(errors.some((e) => e.field === "nombre")).toBe(true);
  });

  test("ignora filas vacías sin emitir error", () => {
    const headers = ["nombre", "codigobarras", "precio", "categoria"];
    const rows = [["", "", "", ""]];
    const { parsed, errors } = parseRowsToProductos(headers, rows);
    expect(parsed).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("recoge múltiples errores por fila distintos", () => {
    const headers = ["nombre", "codigobarras", "precio", "categoria"];
    const rows = [["X", "AB", "abc", ""]];
    const { errors } = parseRowsToProductos(headers, rows);
    const fields = errors.filter((e) => e.row === 1).map((e) => e.field);
    expect(fields).toEqual(
      expect.arrayContaining(["nombre", "codigoBarras", "precio", "categoria"]),
    );
  });
});

// ─── buildCsvTemplate ──────────────────────────────────────────────────────

describe("buildCsvTemplate — plantilla descargable", () => {
  test("incluye headers correctos en la primera fila", () => {
    const csv = buildCsvTemplate();
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toBe(CSV_TEMPLATE_HEADERS.join(","));
  });

  test("incluye 2 filas de ejemplo", () => {
    const csv = buildCsvTemplate();
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(3); // header + 2 ejemplos
  });

  test("template parsea sin errores con parseRowsToProductos", () => {
    const csv = buildCsvTemplate();
    const { headers, rows } = parseCsvText(csv);
    const { errors, parsed } = parseRowsToProductos(headers, rows);
    expect(errors).toEqual([]);
    expect(parsed.length).toBe(2);
  });
});

// ─── previewImportProductos ────────────────────────────────────────────────

function makeFormDataWithCsv(content: string, filename = "test.csv"): FormData {
  const fd = new FormData();
  fd.append(
    "file",
    new File([content], filename, { type: "text/csv" }),
  );
  return fd;
}

describe("previewImportProductos — Server Action contract", () => {
  test("rechaza si no hay file en FormData", async () => {
    const fd = new FormData();
    const res = await previewImportProductos(fd);
    expect(res.ok).toBe(false);
  });

  test("rechaza file vacío", async () => {
    const res = await previewImportProductos(makeFormDataWithCsv(""));
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/vacío/i);
  });

  test("rechaza file > MAX_FILE_SIZE", async () => {
    const big = "x".repeat(MAX_FILE_SIZE + 1);
    const res = await previewImportProductos(makeFormDataWithCsv(big));
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/grande/i);
  });

  test("rechaza filas > MAX_ROWS", async () => {
    const header = "nombre,codigoBarras,precio,categoria\n";
    const row = "X,C1,1990,Bebidas\n";
    const csv = header + row.repeat(MAX_ROWS + 1);
    const res = await previewImportProductos(makeFormDataWithCsv(csv));
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/Demasiadas|Máximo/i);
  });

  test("happy path: 2 filas válidas, sin duplicados", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([
      { id: 7, nombre: "Bebidas" },
    ] as never);
    prismaMock.producto.findMany.mockResolvedValue([] as never);

    const csv =
      "nombre,codigoBarras,precio,categoria\n" +
      "Coca,7800001,1990,Bebidas\n" +
      "Pan,7800002,1590,Bebidas\n";
    const res = await previewImportProductos(makeFormDataWithCsv(csv));

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.data!.errors).toEqual([]);
    expect(res.data!.validRows).toHaveLength(2);
    expect(res.data!.validRows[0]?.categoriaId).toBe(7);
  });

  test("error si categoria no existe en DB", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([] as never);
    prismaMock.producto.findMany.mockResolvedValue([] as never);

    const csv =
      "nombre,codigoBarras,precio,categoria\n" +
      "Coca,7800001,1990,NoExiste\n";
    const res = await previewImportProductos(makeFormDataWithCsv(csv));
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.data!.errors).toHaveLength(1);
    expect(res.data!.errors[0]?.message).toMatch(/no existe/i);
    expect(res.data!.validRows).toHaveLength(0);
  });

  test("detecta duplicados intra-CSV", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([
      { id: 7, nombre: "Bebidas" },
    ] as never);
    prismaMock.producto.findMany.mockResolvedValue([] as never);

    const csv =
      "nombre,codigoBarras,precio,categoria\n" +
      "Coca,DUP-1,1990,Bebidas\n" +
      "Pan,DUP-1,2990,Bebidas\n";
    const res = await previewImportProductos(makeFormDataWithCsv(csv));
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(
      res.data!.errors.some(
        (e) => e.field === "codigoBarras" && /duplicado/i.test(e.message),
      ),
    ).toBe(true);
  });

  test("flagea duplicados en DB como warnings (no errors)", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([
      { id: 7, nombre: "Bebidas" },
    ] as never);
    prismaMock.producto.findMany.mockResolvedValue([
      { codigoBarras: "EXIST-1" },
    ] as never);

    const csv =
      "nombre,codigoBarras,precio,categoria\n" +
      "Existing,EXIST-1,1990,Bebidas\n" +
      "New,NEW-1,2990,Bebidas\n";
    const res = await previewImportProductos(makeFormDataWithCsv(csv));
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.data!.errors).toEqual([]);
    expect(res.data!.duplicates).toHaveLength(1);
    expect(res.data!.duplicates[0]?.codigoBarras).toBe("EXIST-1");
    expect(res.data!.validRows).toHaveLength(2);
  });

  test("CAJERO no puede previewear (solo ADMIN)", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const csv = "nombre,codigoBarras,precio,categoria\nA,B,1,C\n";
    const res = await previewImportProductos(makeFormDataWithCsv(csv));
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/ADMIN/);
  });
});

// ─── commitImportProductos ─────────────────────────────────────────────────

describe("commitImportProductos — bulk insert + AuditLog", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.$transaction.mockImplementation(async (cb: any) =>
      cb(prismaMock),
    );
  });

  test("inserta productos nuevos con createMany + AuditLog", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([
      { id: 7, nombre: "Bebidas" },
    ] as never);
    prismaMock.producto.findMany.mockResolvedValue([] as never);
    prismaMock.producto.createMany.mockResolvedValue({ count: 2 } as never);
    prismaMock.auditLog.create.mockResolvedValue({} as never);

    const res = await commitImportProductos({
      rows: [
        {
          row: 1,
          nombre: "Coca",
          codigoBarras: "7800001",
          precio: 1990,
          stock: 60,
          alertaStock: 10,
          categoriaNombre: "Bebidas",
          categoriaId: 7,
          descripcion: null,
          activo: true,
        },
        {
          row: 2,
          nombre: "Pan",
          codigoBarras: "7800002",
          precio: 1590,
          stock: 40,
          alertaStock: 8,
          categoriaNombre: "Bebidas",
          categoriaId: 7,
          descripcion: null,
          activo: true,
        },
      ],
      actualizarExistentes: false,
      filename: "test.csv",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.data!.created).toBe(2);
    expect(res.data!.updated).toBe(0);
    expect(res.data!.skipped).toBe(0);

    // AuditLog escrito.
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    const auditCall = prismaMock.auditLog.create.mock.calls[0]?.[0];
    expect(auditCall?.data.tabla).toBe("productos");
    expect(auditCall?.data.diff).toMatchObject({
      action: "PRODUCTOS_IMPORT_CSV",
      filename: "test.csv",
      created: 2,
    });
  });

  test("skip default cuando codigoBarras existe (sin actualizarExistentes)", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([
      { id: 7, nombre: "Bebidas" },
    ] as never);
    prismaMock.producto.findMany.mockResolvedValue([
      { id: 99, codigoBarras: "7800001" },
    ] as never);
    prismaMock.producto.createMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.auditLog.create.mockResolvedValue({} as never);

    const res = await commitImportProductos({
      rows: [
        {
          row: 1,
          nombre: "Coca",
          codigoBarras: "7800001",
          precio: 1990,
          stock: 60,
          alertaStock: 10,
          categoriaNombre: "Bebidas",
          categoriaId: 7,
          descripcion: null,
          activo: true,
        },
      ],
      actualizarExistentes: false,
      filename: "test.csv",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.data!.created).toBe(0);
    expect(res.data!.skipped).toBe(1);
    expect(prismaMock.producto.update).not.toHaveBeenCalled();
  });

  test("update existentes cuando actualizarExistentes=true", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([
      { id: 7, nombre: "Bebidas" },
    ] as never);
    prismaMock.producto.findMany.mockResolvedValue([
      { id: 99, codigoBarras: "7800001" },
    ] as never);
    prismaMock.producto.update.mockResolvedValue({} as never);
    prismaMock.auditLog.create.mockResolvedValue({} as never);

    const res = await commitImportProductos({
      rows: [
        {
          row: 1,
          nombre: "Coca",
          codigoBarras: "7800001",
          precio: 2490,
          stock: 80,
          alertaStock: 12,
          categoriaNombre: "Bebidas",
          categoriaId: 7,
          descripcion: null,
          activo: true,
        },
      ],
      actualizarExistentes: true,
      filename: "test.csv",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.data!.updated).toBe(1);
    expect(prismaMock.producto.update).toHaveBeenCalledTimes(1);
    const updateArgs = prismaMock.producto.update.mock.calls[0]?.[0];
    expect(updateArgs?.where).toEqual({ id: 99 });
    expect(updateArgs?.data).toMatchObject({ precio: 2490, stock: 80 });
  });

  test("error si rows vacío", async () => {
    const res = await commitImportProductos({
      rows: [],
      actualizarExistentes: false,
      filename: "test.csv",
    });
    expect(res.ok).toBe(false);
  });

  test("error si categoria desapareció entre preview y commit", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([] as never); // categoria borrada

    const res = await commitImportProductos({
      rows: [
        {
          row: 1,
          nombre: "X",
          codigoBarras: "C1",
          precio: 1990,
          stock: 0,
          alertaStock: 5,
          categoriaNombre: "Bebidas",
          categoriaId: 7,
          descripcion: null,
          activo: true,
        },
      ],
      actualizarExistentes: false,
      filename: "test.csv",
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/no existe/i);
  });

  test("CAJERO no puede commitear", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await commitImportProductos({
      rows: [],
      actualizarExistentes: false,
      filename: "x",
    });
    expect(res.ok).toBe(false);
  });
});
