import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import runtimeCaching from "next-pwa/cache";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching,
  fallbacks: { document: "/offline" },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default withPWA(nextConfig);
