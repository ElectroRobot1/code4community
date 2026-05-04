"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import BroadRunClubDirectory from "@/components/club-hub/BroadRunClubDirectory";

const MAROON = "#5c1417";

export default function ClubHubDirectoryPage() {
  useLayoutEffect(() => {
    document.title = "Broad Run Club Directory";
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <nav className="border-b border-black/10 shadow-md" style={{ backgroundColor: MAROON }}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-4 py-3.5 text-sm font-semibold tracking-wide text-white sm:gap-12 sm:text-base md:gap-16">
          <Link href="/club-hub" className="hover:underline underline-offset-4">
            Home
          </Link>
          <span className="cursor-default opacity-95 underline decoration-white underline-offset-4">Club Directory</span>
          <Link href="/login?redirectTo=%2Fclub-hub%2Fdirectory" className="hover:underline underline-offset-4">
            Log in
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[90vw] px-4 pb-12 pt-10 sm:px-6 sm:pt-12">
        <BroadRunClubDirectory />
      </main>

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        <Link href="/club-hub" className="text-[#5c1417] hover:underline">
          ← Broad Run Club Hub
        </Link>
        <span className="mx-2 text-neutral-300">·</span>
        <Link href="/" className="hover:underline">
          Code4Community home
        </Link>
      </footer>
    </div>
  );
}
