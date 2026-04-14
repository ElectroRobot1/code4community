"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Segments grouped like the reference: 2 + 3 + 3 + 3 = 11 */
const GROUP_SIZES = [2, 3, 3, 3];
const TOTAL_SEGMENTS = 11;
/** Cumulative correct answers needed to light each star */
const GROUP_THRESHOLDS = [2, 5, 8, 11];

const STAR_RING = [
  "text-blue-600 dark:text-blue-400",
  "text-blue-500 dark:text-blue-300",
  "text-cyan-600 dark:text-cyan-400",
  "text-emerald-600 dark:text-emerald-400",
];

const BURST_FILL = [
  "fill-blue-600 dark:fill-blue-400",
  "fill-blue-500 dark:fill-blue-300",
  "fill-cyan-500 dark:fill-cyan-400",
  "fill-emerald-500 dark:fill-emerald-400",
];

const STAR_LABELS = ["First star!", "Second star!", "Third star!", "Fourth star!"];

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function getBurstTier(prevCorrect, nextCorrect) {
  for (let i = 0; i < GROUP_THRESHOLDS.length; i += 1) {
    const threshold = GROUP_THRESHOLDS[i];
    if (prevCorrect < threshold && nextCorrect >= threshold) {
      return i;
    }
  }
  return null;
}

function StarIcon({ filled, ringClass }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      className={`shrink-0 ${ringClass} ${filled ? "fill-current" : "fill-none stroke-current"}`}
      strokeWidth="1.75"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

function StarBurstOverlay({ tier }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center pointer-events-auto study-star-burst-root"
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={STAR_LABELS[tier]}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative z-10 flex flex-col items-center px-6 max-w-sm">
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 study-star-burst-pop">
          <svg
            viewBox="0 0 24 24"
            className="absolute inset-0 h-full w-full text-amber-200/90 dark:text-amber-900/50 fill-none stroke-current stroke-[1.25]"
            aria-hidden
          >
            <path d={STAR_PATH} />
          </svg>
          <div className="study-star-fill-up absolute inset-0 overflow-hidden">
            <svg
              viewBox="0 0 24 24"
              className={`h-full w-full ${BURST_FILL[tier]}`}
              aria-hidden
            >
              <path d={STAR_PATH} />
            </svg>
          </div>
        </div>
        <p className="mt-8 text-center text-xl sm:text-2xl font-bold text-white drop-shadow-md">
          {STAR_LABELS[tier]}
        </p>
        <p className="mt-1 text-sm text-white/85 text-center">
          Keep going — you&apos;re building mastery.
        </p>
      </div>
    </div>
  );
}

/**
 * NoRedInk-style session strip: brand, topic, mastery stars, questions count, segmented progress.
 */
export default function StudySessionProgressHeader({
  topicTitle,
  questionsAnswered,
  /** Correct answers only — one solid segment per correct (wrong/skipped do not advance the bar). */
  questionsCorrect,
  totalQuestions,
  onEndSession,
}) {
  const filledSegments = Math.min(TOTAL_SEGMENTS, Math.max(0, questionsCorrect));

  const [burstTier, setBurstTier] = useState(null);
  const initializedRef = useRef(false);
  const prevCorrectRef = useRef(0);
  const burstStartTimerRef = useRef(null);
  const burstClearTimerRef = useRef(null);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevCorrectRef.current = questionsCorrect;
      return;
    }
    const prev = prevCorrectRef.current;
    if (questionsCorrect > prev) {
      const tier = getBurstTier(prev, questionsCorrect);
      if (tier !== null) {
        if (burstStartTimerRef.current) {
          window.clearTimeout(burstStartTimerRef.current);
        }
        if (burstClearTimerRef.current) {
          window.clearTimeout(burstClearTimerRef.current);
        }
        burstStartTimerRef.current = window.setTimeout(() => {
          setBurstTier(tier);
          burstStartTimerRef.current = null;
        }, 0);
        burstClearTimerRef.current = window.setTimeout(() => {
          setBurstTier(null);
          burstClearTimerRef.current = null;
        }, 2500);
      }
    }
    prevCorrectRef.current = questionsCorrect;
  }, [questionsCorrect]);

  useEffect(() => {
    return () => {
      if (burstStartTimerRef.current) {
        window.clearTimeout(burstStartTimerRef.current);
      }
      if (burstClearTimerRef.current) {
        window.clearTimeout(burstClearTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
      {burstTier !== null &&
        typeof document !== "undefined" &&
        createPortal(<StarBurstOverlay tier={burstTier} />, document.body)}
      <div className="px-4 py-3 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="font-bold text-primary shrink-0 tracking-tight text-sm sm:text-base">
            Code4Community
          </span>
          <span className="h-5 w-px bg-border shrink-0" aria-hidden />
          <h2 className="text-sm sm:text-base font-semibold text-foreground truncate min-w-0">
            {topicTitle || "Practice"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 justify-between sm:justify-end w-full sm:w-auto">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 min-w-[9rem]">
            <div className="flex justify-center gap-1 sm:gap-1.5 mb-1">
              {[0, 1, 2, 3].map((star) => (
                <StarIcon
                  key={star}
                  filled={questionsCorrect >= GROUP_THRESHOLDS[star]}
                  ringClass={STAR_RING[star]}
                />
              ))}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground text-center tabular-nums">
              Questions answered: {questionsAnswered}
            </p>
          </div>
          <button
            type="button"
            onClick={onEndSession}
            className="px-3 py-1.5 border border-red-500/50 text-red-600 dark:text-red-400 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-500/10 shrink-0"
          >
            End session
          </button>
        </div>
      </div>
      <div
        className="px-4 pb-3 sm:px-5 flex gap-2 sm:gap-3"
        role="group"
        aria-label={`Session progress: ${questionsAnswered} question${questionsAnswered === 1 ? "" : "s"} completed out of ${totalQuestions} loaded`}
      >
        {GROUP_SIZES.map((size, gi) => {
          const groupStart = GROUP_SIZES.slice(0, gi).reduce((sum, current) => sum + current, 0);
          return (
          <div key={gi} className="flex gap-0.5 flex-1 min-w-0">
            {Array.from({ length: size }, (_, j) => {
              const idx = groupStart + j;
              const filled = idx < filledSegments;
              return (
                <div
                  key={idx}
                  className={`h-2.5 flex-1 rounded-sm min-w-[4px] transition-colors duration-300 ${
                    filled ? "bg-blue-600 dark:bg-blue-500" : "bg-muted"
                  }`}
                />
              );
            })}
          </div>
          );
        })}
      </div>
    </div>
  );
}
