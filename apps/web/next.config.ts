import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/ui"],
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer", "exceljs"],
};

export default nextConfig;
