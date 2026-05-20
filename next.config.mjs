import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// firebase.js imports ./keys.dev.js (gitignored locally). CI/Vercel has no file — alias to tempkeys.dev.js.
const useKeysDevFallback = !fs.existsSync(path.join(__dirname, "keys.dev.js"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cspValue = isDevelopment
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://accounts.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net https://c4cdev-6f9f4.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: http://localhost http://127.0.0.1 ws://localhost ws://127.0.0.1 wss://localhost wss://127.0.0.1 https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net https://c4cdev-6f9f4.firebaseapp.com; frame-src 'self' https://accounts.google.com https://apis.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net https://c4cdev-6f9f4.firebaseapp.com https://*.google.com https://*.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://accounts.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net; frame-src 'self' https://accounts.google.com https://apis.google.com https://brhs25.firebaseapp.com https://brhsdev.firebaseapp.com https://code4community26.firebaseapp.com https://code4community.net https://*.google.com https://*.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests; block-all-mixed-content";

    return [
      {
        source: '/(.*)',
        headers: [
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
        ],
      },
    ];
  },
};

export default nextConfig;
