import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fieldcert/cert-schemas", "@fieldcert/rules-engine"],
};

export default nextConfig;
