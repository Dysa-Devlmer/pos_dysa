import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
