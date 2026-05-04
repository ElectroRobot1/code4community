"use client";

import { useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import LaurelRankSeal from "@/components/club-hub/LaurelRankSeal";
import ClubHubWeekCalendar from "@/components/club-hub/ClubHubWeekCalendar";
import { CLUB_ENGAGEMENT_RANKINGS } from "@/lib/clubHubEngagementRankings";

const MAROON = "#5c1417";
const MAROON_DARK = "#3f0e10";

function rankNameClass(rank) {
  if (rank === 1) return "text-[#b45309]";
  if (rank === 2) return "text-slate-500";
  return "text-[#9a3412]";
}

export default function ClubHubPage() {
  useLayoutEffect(() => {
    document.title = "Broad Run Club Hub";
  }, []);

  return (
    <div id="top" className="min-h-screen bg-neutral-100 text-neutral-900">
      <section className="relative min-h-[280px] sm:min-h-[340px]">
        <Image
          src="/Broad_Run_HS_Ashburn_VA_20147_ext2.JPG"
          alt="Broad Run High School, Ashburn, Virginia"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(60,12,16,0.55) 0%, rgba(60,12,16,0.82) 100%)`,
          }}
        />
        <div className="relative z-10 flex min-h-[280px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[340px]">
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
            Broad Run Club Hub
          </h1>
        </div>
      </section>

      <nav className="border-b border-black/10 shadow-md" style={{ backgroundColor: MAROON }}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-4 py-3.5 text-sm font-semibold tracking-wide text-white sm:gap-12 sm:text-base md:gap-16">
          <Link href="#top" className="hover:underline underline-offset-4">
            Home
          </Link>
          <Link href="/club-hub/directory" className="hover:underline underline-offset-4">
            Club Directory
          </Link>
          <Link href="/login?redirectTo=%2Fclub-hub" className="hover:underline underline-offset-4">
            Log in
          </Link>
        </div>
      </nav>

      <main id="club-directory" className="mx-auto max-w-6xl px-4 pb-0 pt-10 sm:px-6 sm:pt-12">
        <div className="grid gap-6 md:grid-cols-3">
          {CLUB_ENGAGEMENT_RANKINGS.map((col) => (
            <div
              key={col.title}
              className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.07)]"
            >
              <div
                className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-white sm:text-[13px]"
                style={{ backgroundColor: MAROON }}
              >
                {col.title}
              </div>
              <ul className="space-y-2.5 bg-gradient-to-b from-neutral-50/90 to-white p-3">
                {col.rows.map((row) => (
                  <li
                    key={`${col.title}-${row.name}`}
                    className="rounded-lg bg-white px-1 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.04] sm:px-2 sm:py-3"
                  >
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <LaurelRankSeal rank={row.rank} mirrored />
                      <span
                        className={`min-w-0 flex-1 px-1 text-center text-xs font-semibold leading-snug sm:text-sm md:text-base ${rankNameClass(row.rank)}`}
                      >
                        {row.name}
                      </span>
                      <LaurelRankSeal rank={row.rank} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      <div className="bg-white py-6 sm:py-8" aria-hidden />

      <section
        className="relative border-t border-black/10"
        style={{
          backgroundColor: MAROON_DARK,
          backgroundImage:
            "linear-gradient(rgba(40,8,10,0.88), rgba(40,8,10,0.92)), url(/Broad_Run_HS_Ashburn_VA_20147_ext2.JPG)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="pointer-events-none absolute inset-0 backdrop-blur-[2px]" aria-hidden />
        <div className="relative z-10 w-full">
          <ClubHubWeekCalendar />
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        <Link href="/" className="text-[#5c1417] hover:underline">
          ← Back to Code4Community
        </Link>
      </footer>
    </div>
  );
}
