"use client";

import { useEffect, useState, useMemo } from "react";
import {
  loadStudyStats,
  formatDurationSeconds,
  getLocalDateKey,
} from "@/utils/studyStatsFirestore";

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

/** Last 42 days as day cells, then pad start so weeks align (Sun–Sat). */
function buildCalendarGrid(stats) {
  const daily = stats?.daily || {};
  const days = [];
  for (let i = 41; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = getLocalDateKey(d);
    const bucket = daily[key] || {};
    days.push({
      key,
      label: d.getDate(),
      seconds: typeof bucket.seconds === "number" ? bucket.seconds : 0,
    });
  }
  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - 41);
  const lead = rangeStart.getDay();
  const padded = [...Array(lead).fill(null), ...days];
  while (padded.length % 7 !== 0) padded.push(null);
  const rows = [];
  for (let i = 0; i < padded.length; i += 7) {
    rows.push(padded.slice(i, i + 7));
  }
  return rows;
}

export default function StudyStatsSection({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await loadStudyStats(user);
      if (!cancelled) {
        setStats(s);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const weekRows = useMemo(() => (stats ? buildCalendarGrid(stats) : []), [stats]);
  const maxSeconds = useMemo(() => {
    if (!stats?.daily) return 1;
    let m = 1;
    for (const v of Object.values(stats.daily)) {
      if (v && typeof v.seconds === "number") m = Math.max(m, v.seconds);
    }
    return m;
  }, [stats]);

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-background p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Study statistics</h2>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  if (!stats) return null;

  const wrong = Math.max(0, stats.totalQuestions - stats.correct - stats.skipped);

  return (
    <section className="rounded-xl border border-border bg-background p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-1">Study statistics</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Totals from AI study and math practice on Code4Community (stored in your account).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total questions</p>
          <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">{stats.totalQuestions}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Correct</p>
          <p className="text-2xl font-semibold text-green-700 dark:text-green-400 tabular-nums mt-1">
            {stats.correct}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wrong</p>
          <p className="text-2xl font-semibold text-amber-800 dark:text-amber-200 tabular-nums mt-1">{wrong}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skipped</p>
          <p className="text-2xl font-semibold text-blue-800 dark:text-blue-300 tabular-nums mt-1">
            {stats.skipped}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-4 sm:col-span-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total time</p>
          <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">
            {formatDurationSeconds(stats.totalSeconds)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <h3 className="text-sm font-semibold text-foreground mb-3">Time per day (last 6 weeks)</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Darker = more study time that day. Hover a square for the date.
        </p>
        <div className="flex gap-1 mb-1 min-w-[14rem]">
          {weekdayLabels.map((w, i) => (
            <div
              key={i}
              className="w-8 text-center text-[10px] text-muted-foreground shrink-0"
              aria-hidden
            >
              {w}
            </div>
          ))}
        </div>
        <div className="space-y-1 min-w-[14rem]">
          {weekRows.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((cell, ci) => {
                if (!cell) {
                  return <div key={`e-${ri}-${ci}`} className="w-8 h-8 shrink-0" aria-hidden />;
                }
                const intensity = cell.seconds <= 0 ? 0 : Math.min(1, cell.seconds / maxSeconds);
                const bg =
                  cell.seconds <= 0
                    ? "bg-muted/40 border border-border"
                    : intensity < 0.25
                      ? "bg-primary/20 border border-primary/30"
                      : intensity < 0.5
                        ? "bg-primary/40 border border-primary/40"
                        : intensity < 0.75
                          ? "bg-primary/60 border border-primary/50"
                          : "bg-primary border border-primary";
                return (
                  <div
                    key={cell.key}
                    title={`${cell.key}: ${formatDurationSeconds(cell.seconds)}`}
                    className={`w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-[10px] font-medium text-foreground/90 ${bg}`}
                  >
                    <span className="sr-only">
                      {cell.key}: {formatDurationSeconds(cell.seconds)}
                    </span>
                    <span aria-hidden className="opacity-70">
                      {cell.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
