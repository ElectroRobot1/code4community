"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders LaTeX with KaTeX (proper superscripts, fractions, etc.).
 * Use `\text{...}` for prose mixed with math, or use `inline` inside {@link MixedMathLine}.
 *
 * @param {{ latex: string; display?: boolean; inline?: boolean; className?: string }} props
 */
export default function MathText({ latex, display = false, inline = false, className = "" }) {
  if (typeof latex !== "string" || !latex.trim()) return null;
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: display,
    colorIsTextColor: true,
    strict: "ignore",
  });
  const modeClass = display
    ? "katex-display block text-center my-2"
    : inline
      ? "math-text--inline"
      : "";
  return (
    <span
      className={`math-text ${modeClass} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
