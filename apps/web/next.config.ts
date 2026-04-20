import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Permissions-Policy",
    // USB desactivado intencionalmente. Si en el futuro se conectan
    // periféricos via WebUSB (lectores de barras, impresoras fiscales),
    // agregar: usb=(self) y revisar CSP.
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer", "exceljs", "sharp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      // Algunos browsers / extensiones (PWA installers, Lighthouse audits)
      // solicitan /manifest.json por convención legacy. Next 15 emite el
      // manifest en /manifest.webmanifest desde app/manifest.ts. Reescribimos
      // la ruta .json → .webmanifest para que ambas resuelvan y evitar 404.
      { source: "/manifest.json", destination: "/manifest.webmanifest" },
    ];
  },
};

export default nextConfig;
