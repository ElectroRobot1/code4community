import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// firebase.js imports ./keys.dev.js (gitignored locally). CI/Vercel has no file — alias to tempkeys.dev.js.
const useKeysDevFallback = !fs.existsSync(path.join(__dirname, "keys.dev.js"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // New hash on every deploy so chunk URLs change and immutable browser cache cannot go stale.
  generateBuildId: async () => {
    if (process.env.NEXT_DEPLOYMENT_ID) return process.env.NEXT_DEPLOYMENT_ID;
    if (process.env.K_REVISION) return process.env.K_REVISION;
    // Stable id in dev avoids new chunk hashes every restart (hydration / HMR mismatches).
    if (process.env.NODE_ENV === "development") return "development";
    return `build-${Date.now()}`;
  },
  experimental: {
    // Next.js requires static >= 30; lower router cache TTL than default (5 min dynamic / 5 min static default varies)
    staleTimes: {
      dynamic: 30,
      static: 30,
    },
  },
  ...(useKeysDevFallback
    ? {
        webpack(config) {
          config.resolve.alias = {
            ...(config.resolve.alias || {}),
            [path.resolve(__dirname, "keys.dev.js")]: path.resolve(
              __dirname,
              "tempkeys.dev.js",
            ),
          };
          return config;
        },
        turbopack: {
          resolveAlias: {
            "./keys.dev.js": "./tempkeys.dev.js",
          },
        },
      }
    : {}),
  async redirects() {
    return [
      {
        source: "/mathlab/scheduler",
        destination: "/office-hours/scheduler",
        permanent: true,
      },
      {
        source: "/mathlab/scheduler/manage",
        destination: "/office-hours/scheduler/manage",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**'
      }
    ]
  },
  async headers() {
    // Build CSP based on environment
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_USE_DEV_FIREBASE === "1";
    const cspValue = isDevelopment
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://accounts.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community26.web.app https://c4cdev-6f9f4.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: http://localhost http://127.0.0.1 ws://localhost ws://127.0.0.1 wss://localhost wss://127.0.0.1 https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community26.web.app https://c4cdev-6f9f4.firebaseapp.com; frame-src 'self' https://accounts.google.com https://apis.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community26.web.app https://c4cdev-6f9f4.firebaseapp.com https://*.google.com https://*.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://accounts.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community26.web.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community26.web.app; frame-src 'self' https://accounts.google.com https://apis.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community26.web.app https://*.google.com https://*.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests; block-all-mixed-content";

    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: cspValue,
      },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
    ];

    if (isDevelopment) {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders,
        },
      ];
    }

    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/((?!_next/static|_next/image|favicon.ico|c4c.png|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
