"use client";

import { useId } from "react";

/** Decorative laurel-style seal with rank digit — mirrored left/right in ranking rows */

const PALETTE = {
  1: {
    branch: "#b45309",
    leaf: "#fbbf24",
    leafDeep: "#d97706",
    disk: "#fffbeb",
    diskStroke: "#f59e0b",
    num: "#92400e",
    glow: "#fcd34d",
  },
  2: {
    branch: "#475569",
    leaf: "#cbd5e1",
    leafDeep: "#94a3b8",
    disk: "#f8fafc",
    diskStroke: "#94a3b8",
    num: "#334155",
    glow: "#e2e8f0",
  },
  3: {
    branch: "#9a3412",
    leaf: "#fb923c",
    leafDeep: "#ea580c",
    disk: "#fff7ed",
    diskStroke: "#ea580c",
    num: "#7c2d12",
    glow: "#fdba74",
  },
};

export default function LaurelRankSeal({ rank, mirrored }) {
  const rid = useId().replace(/:/g, "");
  const p = PALETTE[rank] || PALETTE[3];
  const uid = `lr-${rank}-${rid}`;

  return (
    <svg
      viewBox="0 0 52 58"
      className={`h-[50px] w-[46px] shrink-0 sm:h-[54px] sm:w-[50px] ${mirrored ? "scale-x-[-1]" : ""}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.leaf} />
          <stop offset="100%" stopColor={p.leafDeep} />
        </linearGradient>
      </defs>

      {/* Left vine */}
      <path
        d="M26 46 C10 38 6 26 10 14 C12 8 18 6 22 10"
        fill="none"
        stroke={p.branch}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Right vine */}
      <path
        d="M26 46 C42 38 46 26 42 14 C40 8 34 6 30 10"
        fill="none"
        stroke={p.branch}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Leaves — left cluster */}
      <ellipse cx="14" cy="18" rx="5" ry="8" fill={`url(#${uid}-g)`} transform="rotate(-28 14 18)" opacity={0.92} />
      <ellipse cx="11" cy="28" rx="4" ry="7" fill={`url(#${uid}-g)`} transform="rotate(-8 11 28)" opacity={0.88} />
      <ellipse cx="12" cy="38" rx="4" ry="6" fill={`url(#${uid}-g)`} transform="rotate(12 12 38)" opacity={0.85} />
      {/* Leaves — right cluster */}
      <ellipse cx="38" cy="18" rx="5" ry="8" fill={`url(#${uid}-g)`} transform="rotate(28 38 18)" opacity={0.92} />
      <ellipse cx="41" cy="28" rx="4" ry="7" fill={`url(#${uid}-g)`} transform="rotate(8 41 28)" opacity={0.88} />
      <ellipse cx="40" cy="38" rx="4" ry="6" fill={`url(#${uid}-g)`} transform="rotate(-12 40 38)" opacity={0.85} />

      {/* Center medallion */}
      <circle cx="26" cy="30" r="11.5" fill={p.disk} stroke={p.diskStroke} strokeWidth="1.8" />
      <circle cx="26" cy="30" r="10" fill="none" stroke={p.glow} strokeWidth="0.75" opacity={0.65} />
      <text
        x="26"
        y="35"
        textAnchor="middle"
        fontSize="17"
        fontWeight={800}
        fill={p.num}
        fontFamily="system-ui, ui-sans-serif, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
}
