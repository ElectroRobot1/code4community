"use client";

import MathText from "@/components/MathText";

/**
 * @typedef {{ type: 'text', value: string } | { type: 'bold', value: string } | { type: 'math', latex: string }} MixedPart
 */

/**
 * Prose that wraps naturally, with small inline KaTeX where needed (no horizontal scroll).
 * @param {{ parts: MixedPart[]; className?: string }} props
 */
export default function MixedMathLine({ parts, className = "" }) {
  if (!Array.isArray(parts) || parts.length === 0) return null;
  return (
    <span className={`break-words ${className}`}>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.value}</span>;
        if (p.type === "bold") return <strong key={i}>{p.value}</strong>;
        if (p.type === "math") return <MathText key={i} latex={p.latex} inline />;
        return null;
      })}
    </span>
  );
}
