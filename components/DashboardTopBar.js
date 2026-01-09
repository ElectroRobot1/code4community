"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function DashboardTopBar({ title = "Code4Community", onNavigation, showNavLinks = true }) {
  const router = useRouter();


  return (
    <>
      <header className="bg-background border-b border-border px-6 py-4 mb-6 relative z-40">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <Image
                  src="/spartan.png"
                  alt="Code4Community Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <button
                  onClick={() => router.push("/welcome")}
                  className="text-xl font-semibold text-foreground hover:text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  title="Go to Home"
                >
                  {title}
                </button>
              </div>
              
              {/* Home Button - Always show */}
              <button
                onClick={() => router.push("/welcome")}
                className="nav-link"
                title="Go to Home"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
              
              {/* Navigation Links - Only show if showNavLinks is true */}
              {showNavLinks && (
                <>
                  {/* Currently no navigation links are implemented */}
                </>
              )}
            </div>

          </div>
        </div>
      </header>
    </>
  );
}
