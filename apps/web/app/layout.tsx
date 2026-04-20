import type { Metadata } from "next";
import { Toaster } from "sonner";
import { checkEnv } from "@/lib/check-env";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

checkEnv();

export const metadata: Metadata = {
  title: { default: "POS Chile", template: "%s | POS Chile" },
  description:
    "Sistema de punto de venta profesional para negocios chilenos",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000",
  ),
  applicationName: "POS Chile",
  openGraph: {
    title: "POS Chile",
    description:
      "Sistema de punto de venta profesional para negocios chilenos",
    type: "website",
    locale: "es_CL",
  },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icon-192.png", sizes: "192x192" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              theme="system"
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
