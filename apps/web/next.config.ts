import type { NextConfig } from "next";

// CSP — política base. Allowlists actuales:
//   - Sentry ingest: *.ingest.sentry.io / *.sentry.io / browser.sentry-cdn.com
//   - Tailwind v4 + Next 15 hidratación → 'unsafe-inline' style + script
//   - 'unsafe-eval' SOLO en development (Turbopack HMR)
//
// Extender cuando llegue:
//   - Webpay/Transbank → connect-src https://webpay3g.transbank.cl
//   - Imágenes R2 público → img-src https://apk-dy-pos.zgamersa.com
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://browser.sentry-cdn.com https://js.sentry-cdn.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.ingest.sentry.io https://*.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
  { key: "Content-Security-Policy", value: csp },
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
