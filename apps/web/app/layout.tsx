import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Chile",
  description: "Sistema de Punto de Venta para Chile",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
