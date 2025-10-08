import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

// Security headers are configured in next.config.mjs

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "BRHS Utilities",
  description: "Useful Applications for BRHS",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://code4community.net'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/spartan.png', sizes: '32x32', type: 'image/png' },
      { url: '/spartan.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/spartan.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head></head>
      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* reCAPTCHA container for Firebase App Check */}
        <div id="recaptcha-container" style={{ display: 'none' }}></div>
        <ErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
