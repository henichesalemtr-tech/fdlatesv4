import type { NextConfig } from 'next';
import dotenv from 'dotenv';

// Load .env at build time (local dev + CI/CD that injects .env before build)
dotenv.config({ path: '.env', override: true });

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Serve .well-known/assetlinks.json with correct content-type for Android TWA
  async headers() {
    return [
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    // Platform identifiers — safe to bake at build time
    PROJECT_ID: process.env.HAPPYSEEDS_PROJECT_ID ?? '',
    REACTUS_BASE_URL: process.env.REACTUS_BASE_URL ?? '',

    // NEXT_PUBLIC_VAPID_PUBLIC_KEY is needed on the CLIENT side only.
    // It is NOT secret (it's a public key). Safe to bake at build time.
    // API routes read VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY directly from
    // process.env at runtime via lib/vapid.ts — NOT from this env block.
    NEXT_PUBLIC_VAPID_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
      process.env.VAPID_PUBLIC_KEY ?? '',
  },
  // web-push requires Node.js crypto/https — keep it in Node runtime, not Edge
  serverExternalPackages: [],
};

export default nextConfig;
