import { Share } from "react-native";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://dy-pos.zgamersa.com";

export function publicReceiptUrl(
  token: string,
  kind: "venta" | "devolucion" = "venta",
): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  return kind === "devolucion"
    ? `${base}/comprobante/devolucion/${token}`
    : `${base}/comprobante/${token}`;
}

export async function shareReceipt({
  token,
  numeroBoleta,
  kind = "venta",
}: {
  token: string;
  numeroBoleta: string;
  kind?: "venta" | "devolucion";
}) {
  const url = publicReceiptUrl(token, kind);
  const label =
    kind === "devolucion"
      ? "Comprobante interno de devolución"
      : "Comprobante interno";
  await Share.share({
    title: `${label} ${numeroBoleta}`,
    message: `${label} DyPos CL ${numeroBoleta}\n${url}`,
    url,
  });
}

