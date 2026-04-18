import type { Metadata } from "next";
import { Toaster } from "sonner";
import { checkEnv } from "@/lib/check-env";
import { ThemeProvider } from "@/components/theme-provider";
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
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            theme="system"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
