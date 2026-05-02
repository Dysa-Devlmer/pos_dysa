import { describe, expect, test, beforeEach } from "vitest";

import { prismaMock, resetMocks } from "@/test/setup";
import {
  getPublicRefundReceipt,
  getPublicSaleReceipt,
  getPublicReceiptUrl,
  maskNombre,
  maskRut,
} from "../public-receipts";

beforeEach(() => {
  resetMocks();
});

describe("public receipt masking", () => {
  test("enmascara nombres a primer nombre + inicial del primer apellido", () => {
    // Convención hispana: primer apellido = segundo token, no el último.
    expect(maskNombre("Pierre Benites Solier")).toBe("Pierre B.");
    expect(maskNombre("María González")).toBe("María G.");
    expect(maskNombre("Caja")).toBe("Caja");
    expect(maskNombre("")).toBe("Cliente");
    // Espacios extra y solo nombre.
    expect(maskNombre("   Juan   ")).toBe("Juan");
    expect(maskNombre("Ana  Pérez  Soto")).toBe("Ana P.");
  });

  test("enmascara RUT chileno y no expone cuerpo completo", () => {
    expect(maskRut("12.345.678-9")).toBe("12.***.***-9");
    expect(maskRut("11111111-1")).toBe("11.***.***-1");
    expect(maskRut("mal-rut")).toBe("RUT protegido");
  });

  test("construye URL pública sin doble slash", () => {
    expect(getPublicReceiptUrl("abc", "venta", "https://dy-pos.zgamersa.com/")).toBe(
      "https://dy-pos.zgamersa.com/comprobante/abc",
    );
    expect(getPublicReceiptUrl("def", "devolucion", "https://dy-pos.zgamersa.com")).toBe(
      "https://dy-pos.zgamersa.com/comprobante/devolucion/def",
    );
  });
});

describe("getPublicSaleReceipt", () => {
  test("retorna null si token inválido", async () => {
    await expect(getPublicSaleReceipt("../x")).resolves.toBeNull();
    expect(prismaMock.venta.findFirst).not.toHaveBeenCalled();
  });

  test("retorna recibo con PII enmascarada y sin campos internos", async () => {
    prismaMock.venta.findFirst.mockResolvedValue({
      publicToken: "tok_1234567890",
      numeroBoleta: "B-20260501-ABC12345",
      fecha: new Date("2026-05-01T12:00:00Z"),
      metodoPago: "EFECTIVO",
      cliente: { nombre: "Pierre Benites", rut: "12.345.678-9" },
      detalles: [
        {
          cantidad: 2,
          precioUnitario: 1000,
          subtotal: 2000,
          producto: { nombre: "Pan" },
        },
      ],
      subtotal: 2000,
      descuentoPct: "0",
      descuentoMonto: 0,
      impuesto: 380,
      total: 2380,
    } as never);

    const receipt = await getPublicSaleReceipt("tok_1234567890");
    expect(receipt?.cliente).toEqual({
      nombre: "Pierre B.",
      rut: "12.***.***-9",
    });
    expect(receipt).not.toHaveProperty("usuario");
    expect(receipt).not.toHaveProperty("id");
  });
});

describe("getPublicRefundReceipt", () => {
  test("retorna null si devolución o venta están eliminadas/no existen", async () => {
    prismaMock.devolucion.findFirst.mockResolvedValue(null);
    await expect(getPublicRefundReceipt("tok_1234567890")).resolves.toBeNull();
  });

  test("retorna devolución pública con cliente enmascarado", async () => {
    prismaMock.devolucion.findFirst.mockResolvedValue({
      publicToken: "dev_1234567890",
      fecha: new Date("2026-05-01T13:00:00Z"),
      motivo: "Producto defectuoso",
      esTotal: false,
      montoDevuelto: 1190,
      venta: {
        numeroBoleta: "B-20260501-ABC12345",
        fecha: new Date("2026-05-01T12:00:00Z"),
        cliente: { nombre: "María González", rut: "11.111.111-1" },
      },
      items: [
        {
          cantidad: 1,
          precioUnitario: 1000,
          subtotal: 1000,
          producto: { nombre: "Leche" },
        },
      ],
    } as never);

    const receipt = await getPublicRefundReceipt("dev_1234567890");
    expect(receipt?.venta.cliente).toEqual({
      nombre: "María G.",
      rut: "11.***.***-1",
    });
    expect(receipt).not.toHaveProperty("usuario");
    expect(receipt).not.toHaveProperty("creadoPor");
    // motivo: texto libre interno, NO debe estar en el payload público.
    expect(receipt).not.toHaveProperty("motivo");
  });
});
