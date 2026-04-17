import type { Metadata } from "next";
import { checkEnv } from "@/lib/check-env";
import "./globals.css";

checkEnv();

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
