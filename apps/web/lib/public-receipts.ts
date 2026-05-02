import { prisma } from "@repo/db";

export type PublicReceiptItem = {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type PublicSaleReceipt = {
  kind: "venta";
  publicToken: string;
  numeroBoleta: string;
  fecha: Date;
  metodoPago: string;
  cliente: { nombre: string; rut: string } | null;
  items: PublicReceiptItem[];
  subtotal: number;
  descuentoPct: number;
  descuentoMonto: number;
  impuesto: number;
  total: number;
};

export type PublicRefundReceipt = {
  kind: "devolucion";
  publicToken: string;
  fecha: Date;
  // `motivo` deliberadamente excluido del tipo público: es texto libre
  // ingresado por el cajero y puede contener PII o datos internos
  // ("cliente reclamó por whatsapp, RUT 12.345.678-9"). Vive en la DB
  // y en el detalle admin, NO en la página pública.
  esTotal: boolean;
  montoDevuelto: number;
  venta: {
    numeroBoleta: string;
    fecha: Date;
    cliente: { nombre: string; rut: string } | null;
  };
  items: PublicReceiptItem[];
};

export function maskNombre(nombre: string | null | undefined): string {
  const clean = (nombre ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return "Cliente";
  const parts = clean.split(" ").filter(Boolean);
  const first = parts[0] ?? "Cliente";
  // Convención hispana: primer apellido = segundo token.
  // "Pierre Benites Solier" → "Pierre B." (NO "Pierre S.").
  // "María González" → "María G.". "Pierre" solo → "Pierre".
  const surnameInitial = parts.length > 1 ? `${parts[1]![0]}.` : "";
  return [first, surnameInitial].filter(Boolean).join(" ");
}

export function maskRut(rut: string | null | undefined): string {
  const clean = (rut ?? "").trim().toUpperCase();
  const compact = clean.replace(/\./g, "").replace(/-/g, "");
  if (!/^\d{7,8}[0-9K]$/.test(compact)) return "RUT protegido";
  const body = compact.slice(0, -1);
  const dv = compact.slice(-1);
  return `${body.slice(0, Math.min(2, body.length))}.***.***-${dv}`;
}

function maskCliente(
  cliente: { nombre: string; rut: string } | null,
): { nombre: string; rut: string } | null {
  if (!cliente) return null;
  return {
    nombre: maskNombre(cliente.nombre),
    rut: maskRut(cliente.rut),
  };
}

export function getPublicReceiptUrl(
  token: string,
  kind: "venta" | "devolucion" = "venta",
  origin?: string,
): string {
  const base =
    origin ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://dy-pos.zgamersa.com";
  const path =
    kind === "devolucion"
      ? `/comprobante/devolucion/${token}`
      : `/comprobante/${token}`;
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function getPublicSaleReceipt(
  token: string,
): Promise<PublicSaleReceipt | null> {
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(token)) return null;

  const venta = await prisma.venta.findFirst({
    where: { publicToken: token, deletedAt: null },
    include: {
      cliente: { select: { nombre: true, rut: true } },
      detalles: {
        include: {
          producto: { select: { nombre: true } },
        },
      },
    },
  });
  if (!venta) return null;

  return {
    kind: "venta",
    publicToken: venta.publicToken,
    numeroBoleta: venta.numeroBoleta,
    fecha: venta.fecha,
    metodoPago: venta.metodoPago,
    cliente: maskCliente(venta.cliente),
    items: venta.detalles.map((d) => ({
      nombre: d.producto.nombre,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.subtotal,
    })),
    subtotal: venta.subtotal,
    descuentoPct: Number(venta.descuentoPct),
    descuentoMonto: venta.descuentoMonto,
    impuesto: venta.impuesto,
    total: venta.total,
  };
}

export async function getPublicRefundReceipt(
  token: string,
): Promise<PublicRefundReceipt | null> {
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(token)) return null;

  const devolucion = await prisma.devolucion.findFirst({
    where: { publicToken: token, deletedAt: null, venta: { deletedAt: null } },
    include: {
      venta: {
        select: {
          numeroBoleta: true,
          fecha: true,
          cliente: { select: { nombre: true, rut: true } },
        },
      },
      items: {
        include: {
          producto: { select: { nombre: true } },
        },
      },
    },
  });
  if (!devolucion) return null;

  return {
    kind: "devolucion",
    publicToken: devolucion.publicToken,
    fecha: devolucion.fecha,
    esTotal: devolucion.esTotal,
    montoDevuelto: devolucion.montoDevuelto,
    venta: {
      numeroBoleta: devolucion.venta.numeroBoleta,
      fecha: devolucion.venta.fecha,
      cliente: maskCliente(devolucion.venta.cliente),
    },
    items: devolucion.items.map((d) => ({
      nombre: d.producto.nombre,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.subtotal,
    })),
  };
}

