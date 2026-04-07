declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PWAPluginOptions = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: Array<Record<string, unknown>>;
    fallbacks?: {
      document?: string;
      image?: string;
      audio?: string;
      video?: string;
      font?: string;
    };
    buildExcludes?: Array<string | RegExp>;
    publicExcludes?: Array<string | RegExp>;
    scope?: string;
    sw?: string;
  };

  export default function withPWAInit(
    options?: PWAPluginOptions,
  ): (nextConfig: NextConfig) => NextConfig;
}

declare module "next-pwa/cache" {
  const runtimeCaching: Array<Record<string, unknown>>;
  export default runtimeCaching;
}
