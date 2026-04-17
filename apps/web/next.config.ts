import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer"],
};

export default nextConfig;
