"use client";

import { useEffect, useState, useMemo } from "react";
import {
  loadStudyStats,
  formatDurationSeconds,
  getLocalDateKey,
} from "@/utils/studyStatsFirestore";
import { loadStudyWeakness } from "@/utils/studyWeakness";
import {
  loadStudyMastery,
  getDueReviewTagKeys,
  getLowMasteryTagKeys,
  decayedMasteryScore,
} from "@/utils/studyMastery";
import { skillTagLabel } from "@/utils/studyTags";

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];
const STATS_RENDER_NOW = Date.now();

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

function subjectHasSkillRows(subject, weakness, mastery) {
  if (!weakness || !mastery) return false;
  const sub = subject === "science" ? "science" : "history";
  const missTags = weakness[sub]?.tags || {};
  const mastTags = mastery[sub]?.tags || {};
  return [...new Set([...Object.keys(missTags), ...Object.keys(mastTags)])].some(
    (k) => (missTags[k] || 0) > 0 || mastTags[k]
  );
}

function SubjectSkillTable({ subject, weakness, mastery }) {
  const sub = subject === "science" ? "science" : "history";
  const missTags = weakness?.[sub]?.tags || {};
  const mastTags = mastery?.[sub]?.tags || {};
  const keys = [
    ...new Set([...Object.keys(missTags), ...Object.keys(mastTags)]),
  ].filter((k) => (missTags[k] || 0) > 0 || mastTags[k]);
  if (keys.length === 0) return null;

  const rows = keys.map((k) => {
    const misses = missTags[k] || 0;
    const e = mastTags[k];
    let score = null;
    if (e?.lastAt) {
      score = decayedMasteryScore(
        e.score,
        Date.parse(e.lastAt) || STATS_RENDER_NOW,
        STATS_RENDER_NOW
      );
    }
    return { k, misses, score };
  });
  rows.sort((a, b) => {
    if (a.score === null && b.score === null) return b.misses - a.misses;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return a.score - b.score || b.misses - a.misses;
  });

  const title = subject === "science" ? "Science skills" : "History skills";

  return (
    <div className="mb-2">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Skill</th>
              <th className="px-3 py-2 font-medium text-muted-foreground tabular-nums">Mastery</th>
              <th className="px-3 py-2 font-medium text-muted-foreground tabular-nums">Misses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ k, misses, score }) => (
              <tr key={k} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-foreground">{skillTagLabel(subject, k)}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {score === null ? "—" : `${score}`}
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{misses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Mastery is a 0–100 estimate with practice decay; it updates when you answer AI study questions.
      </p>
    </div>
  );
}

function buildSubjectSkillRows(subject, weakness, mastery, now) {
  const sub = subject === "science" ? "science" : "history";
  const missTags = weakness?.[sub]?.tags || {};
  const mastTags = mastery?.[sub]?.tags || {};
  const keys = [...new Set([...Object.keys(missTags), ...Object.keys(mastTags)])].filter(
    (k) => (missTags[k] || 0) > 0 || mastTags[k]
  );
  const rows = keys.map((k) => {
    const misses = missTags[k] || 0;
    const e = mastTags[k];
    let score = null;
    if (e?.lastAt) {
      score = decayedMasteryScore(e.score, Date.parse(e.lastAt) || now, now);
    }
    return { k, misses, score };
  });
  rows.sort((a, b) => {
    if (a.score === null && b.score === null) return b.misses - a.misses;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return a.score - b.score || b.misses - a.misses;
  });
  return rows;
}

function SubjectSkillInsights({ subject, studyWeakness, studyMastery }) {
  const due = studyMastery ? getDueReviewTagKeys(studyMastery, subject) : [];
  const low = studyMastery ? getLowMasteryTagKeys(studyMastery, subject, 40) : [];
  const label = subject === "science" ? "Science" : "History";
  const showTable =
    studyWeakness && studyMastery && subjectHasSkillRows(subject, studyWeakness, studyMastery);

  const hasAny = due.length > 0 || low.length > 0 || showTable;

  if (!hasAny) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No skill data for {label.toLowerCase()} yet. Complete AI study questions in that subject to see mastery and review cues.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {due.length > 0 && (
        <div className="rounded-lg border border-amber-200/80 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <span className="font-medium">{label} — due for review: </span>
          {due.map((k) => skillTagLabel(subject, k)).join(" · ")}
        </div>
      )}
      {low.length > 0 && (
        <div className="rounded-lg border border-orange-200/80 dark:border-orange-900/60 bg-orange-50/70 dark:bg-orange-950/20 px-3 py-2 text-sm">
          <p className="font-medium text-orange-950 dark:text-orange-100 mb-1">
            {label} — strengthen these skills
          </p>
          <ul className="list-disc list-inside text-orange-900/90 dark:text-orange-100/90 space-y-0.5">
            {low.slice(0, 6).map(({ tag, score }) => (
              <li key={tag}>
                {skillTagLabel(subject, tag)} (mastery ~{score})
              </li>
            ))}
          </ul>
        </div>
      )}
      {showTable && (
        <SubjectSkillTable subject={subject} weakness={studyWeakness} mastery={studyMastery} />
      )}
    </div>
  );
}

const headerBtnClass =
  "group relative flex w-full items-start justify-between gap-4 text-left cursor-pointer rounded-xl border border-border bg-background p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/45 hover:bg-muted/35 hover:shadow-md hover:shadow-primary/5 active:translate-y-0 active:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function StudyStatsSection({ user }) {
  const [stats, setStats] = useState(null);
  const [studyWeakness, setStudyWeakness] = useState(null);
  const [studyMastery, setStudyMastery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [subjectTab, setSubjectTab] = useState("history");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [s, w, m] = await Promise.all([
        loadStudyStats(user),
        loadStudyWeakness(user),
        loadStudyMastery(user),
      ]);
      if (!cancelled) {
        setStats(s);
        setStudyWeakness(w);
        setStudyMastery(m);
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
    <div className="mb-6 rounded-xl border border-border bg-background shadow-sm overflow-hidden">
      <button
        type="button"
        className={headerBtnClass}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground mb-1">Study statistics</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Totals from AI study and math practice (stored in your account).
          </p>
          <p className="text-sm text-foreground">
            <span className="font-medium tabular-nums">{stats.totalQuestions}</span>
            <span className="text-muted-foreground"> questions · </span>
            <span className="font-medium tabular-nums">{formatDurationSeconds(stats.totalSeconds)}</span>
            <span className="text-muted-foreground"> total time</span>
          </p>
        </div>
        <span
          className={`mt-1 shrink-0 rounded-full p-2 text-muted-foreground transition-all duration-200 group-hover:bg-primary/12 group-hover:text-primary ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-6 pb-6 pt-2 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Skill insights (AI study)</h3>
            <div
              className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border/80 mb-4"
              role="tablist"
              aria-label="Subject"
            >
              <button
                type="button"
                role="tab"
                aria-selected={subjectTab === "history"}
                onClick={() => setSubjectTab("history")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  subjectTab === "history"
                    ? "bg-background text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                History
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={subjectTab === "science"}
                onClick={() => setSubjectTab("science")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  subjectTab === "science"
                    ? "bg-background text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Science
              </button>
            </div>
            <div role="tabpanel" className="min-h-[4rem]">
              {studyWeakness && studyMastery ? (
                subjectTab === "history" ? (
                  <SubjectSkillInsights
                    subject="history"
                    studyWeakness={studyWeakness}
                    studyMastery={studyMastery}
                  />
                ) : (
                  <SubjectSkillInsights
                    subject="science"
                    studyWeakness={studyWeakness}
                    studyMastery={studyMastery}
                  />
                )
              ) : (
                <p className="text-sm text-muted-foreground">Loading skill data…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
