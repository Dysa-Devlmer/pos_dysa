/**
 * CSV Import — helpers puros (Fase 3A · 2026-05-01).
 *
 * SIN "use server" — Next.js prohíbe exports no-async en archivos
 * marcados con "use server". Los helpers sincronos, constantes, tipos
 * y plantilla viven acá; las Server Actions (`previewImportProductos`,
 * `commitImportProductos`) viven en `import-actions.ts`.
 *
 * Estos helpers son safe para importar tanto desde server (las actions)
 * como desde client components (`import-csv-dialog.tsx` los usa para
 * tipar props y construir la plantilla descargable client-side).
 */

// ─── Constantes ────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_ROWS = 5_000;

const HEADERS_REQUIRED = ["nombre", "codigobarras", "precio", "categoria"] as const;
const HEADERS_KNOWN = [
  "nombre",
  "codigobarras",
  "precio",
  "stock",
  "alertastock",
  "categoria",
  "descripcion",
  "activo",
] as const;

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type RowError = {
  /** 1-indexed, igual a la línea en el archivo (excluyendo header). */
  row: number;
  field?: string;
  message: string;
};

export type ParsedRow = {
  /** 1-indexed sin header. */
  row: number;
  nombre: string;
  codigoBarras: string;
  precio: number;
  stock: number;
  alertaStock: number;
  categoriaNombre: string;
  /** Resuelto en validación contra DB. null hasta entonces. */
  categoriaId: number | null;
  descripcion: string | null;
  activo: boolean;
};

export type ImportPreview = {
  /** Filas válidas listas para insertar/actualizar. */
  validRows: ParsedRow[];
  /** Errores por fila — el commit no se permite hasta resolverlos. */
  errors: RowError[];
  /** Filas que ya existen por codigoBarras (warning, no error). */
  duplicates: { row: number; codigoBarras: string }[];
  /** Total leído del CSV (sin contar header). */
  totalRows: number;
};

export type ImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  /** Filename original para AuditLog. */
  filename: string;
};

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ─── Plantilla CSV descargable ─────────────────────────────────────────────

export const CSV_TEMPLATE_HEADERS = [
  "nombre",
  "codigoBarras",
  "precio",
  "stock",
  "alertaStock",
  "categoria",
  "descripcion",
  "activo",
] as const;

export const CSV_TEMPLATE_ROWS = [
  {
    nombre: "Coca-Cola 1.5L",
    codigoBarras: "7800001",
    precio: "1990",
    stock: "60",
    alertaStock: "10",
    categoria: "Bebidas",
    descripcion: "Bebida gaseosa 1.5L",
    activo: "si",
  },
  {
    nombre: "Pan de molde 500g",
    codigoBarras: "7800002",
    precio: "1.590",
    stock: "40",
    alertaStock: "8",
    categoria: "Almacén",
    descripcion: "Pan blanco rebanado",
    activo: "si",
  },
] as const;

/** Genera el contenido textual de la plantilla CSV. */
export function buildCsvTemplate(): string {
  const header = CSV_TEMPLATE_HEADERS.join(",");
  const rows = CSV_TEMPLATE_ROWS.map((r) =>
    CSV_TEMPLATE_HEADERS.map((h) => csvEscape(r[h] ?? "")).join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Parsing utilities ─────────────────────────────────────────────────────

/**
 * Parser CSV minimalista pero robusto:
 *   - acepta `,` o `;` como delimitador (auto-detect en la primera línea).
 *   - respeta quotes `"..."` con escapes `""`.
 *   - normaliza CRLF, CR, LF.
 *   - tolera BOM UTF-8 al inicio.
 *   - ignora filas completamente vacías.
 *
 * NO usa papaparse para evitar bundle bloat (~50 KB) y mantener control
 * sobre encoding/edge cases.
 */
export function parseCsvText(text: string): {
  delimiter: string;
  headers: string[];
  rows: string[][];
} {
  // Strip BOM si existe.
  const clean = text.replace(/^﻿/, "");

  // Detectar delimitador por la primera línea no vacía.
  const firstLineEnd = clean.search(/[\r\n]/);
  const firstLine = firstLineEnd === -1 ? clean : clean.slice(0, firstLineEnd);
  const semis = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const delimiter = semis > commas ? ";" : ",";

  // Tokenizer respetando quotes.
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        cur.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && clean[i + 1] === "\n") i++;
        cur.push(field);
        field = "";
        // Saltar líneas completamente vacías.
        if (!(cur.length === 1 && cur[0]?.trim() === "")) {
          lines.push(cur);
        }
        cur = [];
      } else {
        field += ch;
      }
    }
  }
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    if (!(cur.length === 1 && cur[0]?.trim() === "")) lines.push(cur);
  }

  if (lines.length === 0) {
    return { delimiter, headers: [], rows: [] };
  }

  const headers = (lines[0] ?? []).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1);
  return { delimiter, headers, rows };
}

/**
 * Normaliza un valor de precio chileno a Int CLP.
 * Acepta:
 *   - "1990"      → 1990
 *   - "1.990"     → 1990
 *   - "$1.990"    → 1990
 *   - "  1.990 "  → 1990
 *   - "1.990.000" → 1990000
 *
 * Rechaza:
 *   - ""             → null (vacío)
 *   - "1990,50"      → null (decimal)
 *   - "1990.50"      → null (decimal con punto, ambiguo)
 *   - "abc"          → null
 */
export function parsePrecioChileno(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, "").trim();
  if (trimmed === "") return null;

  if (/,\d/.test(trimmed)) return null;
  if (/\.\d{1,2}$/.test(trimmed) && !/\.\d{3}/.test(trimmed)) return null;

  const stripped = trimmed.replace(/\./g, "");
  if (!/^-?\d+$/.test(stripped)) return null;

  const n = Number(stripped);
  if (!Number.isInteger(n)) return null;
  return n;
}

/** Normaliza un boolean es-CL: "si"/"no"/"true"/"false"/"1"/"0". */
export function parseBoolEs(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "si" || v === "sí" || v === "true" || v === "1") return true;
  if (v === "no" || v === "false" || v === "0") return false;
  return null;
}

/** Normaliza un Int. Devuelve null si no es válido. */
function parseIntStrict(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^-?\d+$/.test(t)) return null;
  return Number(t);
}

// ─── Validación + tipos ────────────────────────────────────────────────────

/**
 * Valida headers, normaliza valores y valida tipos.
 * NO toca DB — eso lo hace la action `previewImportProductos`.
 */
export function parseRowsToProductos(
  headers: string[],
  rows: string[][],
): { parsed: ParsedRow[]; errors: RowError[] } {
  const errors: RowError[] = [];
  const parsed: ParsedRow[] = [];

  // Validar headers requeridos.
  const headerSet = new Set(headers);
  for (const req of HEADERS_REQUIRED) {
    if (!headerSet.has(req)) {
      errors.push({
        row: 0,
        message: `Falta la columna obligatoria: "${req}"`,
      });
    }
  }
  for (const h of headers) {
    if (!HEADERS_KNOWN.includes(h as never) && h !== "") {
      errors.push({
        row: 0,
        message: `Columna desconocida (ignorada): "${h}"`,
      });
    }
  }
  if (errors.some((e) => e.row === 0 && e.message.startsWith("Falta"))) {
    return { parsed, errors };
  }

  const idx = (col: string) => headers.indexOf(col);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const rowNum = i + 1;
    const get = (col: string): string => {
      const j = idx(col);
      return j === -1 ? "" : (row[j] ?? "").toString();
    };

    const nombre = get("nombre").trim();
    const codigoBarras = get("codigobarras").trim();
    const precioRaw = get("precio");
    const stockRaw = get("stock");
    const alertaStockRaw = get("alertastock");
    const categoriaNombre = get("categoria").trim();
    const descripcion = get("descripcion").trim();
    const activoRaw = get("activo");

    if (
      nombre === "" &&
      codigoBarras === "" &&
      precioRaw.trim() === "" &&
      categoriaNombre === ""
    ) {
      continue;
    }

    let rowHasError = false;
    if (nombre.length < 2 || nombre.length > 120) {
      errors.push({
        row: rowNum,
        field: "nombre",
        message: `Nombre debe tener entre 2 y 120 caracteres (recibido: "${nombre}")`,
      });
      rowHasError = true;
    }
    if (codigoBarras.length < 3 || codigoBarras.length > 60) {
      errors.push({
        row: rowNum,
        field: "codigoBarras",
        message: `codigoBarras debe tener entre 3 y 60 caracteres (recibido: "${codigoBarras}")`,
      });
      rowHasError = true;
    }
    const precio = parsePrecioChileno(precioRaw);
    if (precio === null) {
      errors.push({
        row: rowNum,
        field: "precio",
        message: `precio inválido: "${precioRaw}". Usa entero CLP (ej. 1990 o 1.990). Decimales no permitidos.`,
      });
      rowHasError = true;
    } else if (precio < 0 || precio > 99_999_999) {
      errors.push({
        row: rowNum,
        field: "precio",
        message: `precio fuera de rango (0 a 99.999.999): ${precio}`,
      });
      rowHasError = true;
    }

    const stock = stockRaw.trim() === "" ? 0 : parseIntStrict(stockRaw);
    if (stock === null || stock < 0 || stock > 1_000_000) {
      errors.push({
        row: rowNum,
        field: "stock",
        message: `stock inválido: "${stockRaw}". Entero entre 0 y 1.000.000.`,
      });
      rowHasError = true;
    }

    const alertaStock =
      alertaStockRaw.trim() === "" ? 5 : parseIntStrict(alertaStockRaw);
    if (alertaStock === null || alertaStock < 0) {
      errors.push({
        row: rowNum,
        field: "alertaStock",
        message: `alertaStock inválido: "${alertaStockRaw}".`,
      });
      rowHasError = true;
    }

    if (categoriaNombre === "") {
      errors.push({
        row: rowNum,
        field: "categoria",
        message: `categoria es obligatoria.`,
      });
      rowHasError = true;
    }

    const activo =
      activoRaw.trim() === "" ? true : parseBoolEs(activoRaw);
    if (activo === null) {
      errors.push({
        row: rowNum,
        field: "activo",
        message: `activo inválido: "${activoRaw}". Usa "si" o "no".`,
      });
      rowHasError = true;
    }

    if (rowHasError) continue;

    parsed.push({
      row: rowNum,
      nombre,
      codigoBarras,
      precio: precio!,
      stock: stock!,
      alertaStock: alertaStock!,
      categoriaNombre,
      categoriaId: null,
      descripcion: descripcion === "" ? null : descripcion,
      activo: activo!,
    });
  }

  return { parsed, errors };
}
