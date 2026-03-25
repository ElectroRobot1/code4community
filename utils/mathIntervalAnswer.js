/**
 * Replace "inf" with ∞ as the user types (interval notation).
 * Uses lookaheads so "infinity" / "infinite" are not broken (no "∞inity").
 */
export function replaceInfWithInfinitySymbol(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/\(-\s*inf(?=[,\)\s]|$)/gi, "(-∞")
    .replace(/,\s*inf(?=[,\)\s]|$)/gi, ", ∞")
    .replace(/\binf\b/gi, "∞");
}

/**
 * Whether the student's answer denotes (−∞, ∞) / all real numbers as an interval.
 */
export function isIncreasingIntervalAllReals(studentAnswer) {
  if (typeof studentAnswer !== "string") return false;
  let s = studentAnswer.trim().toLowerCase();
  s = s.replace(/\s+/g, " ");
  s = s.replace(/−/g, "-");
  s = s.replace(/∞/g, "infinity");
  s = s.replace(/ℝ/g, "R");

  // Parentheses interval forms
  const intervalOk =
    /^\(\s*-\s*infinity\s*,\s*infinity\s*\)$/.test(s) ||
    /^\(\s*-\s*inf\s*,\s*inf\s*\)$/.test(s) ||
    /^\(\s*-\s*infinity\s*to\s*infinity\s*\)$/.test(s) ||
    /^\(\s*neg\.?\s*infinity\s*,\s*infinity\s*\)$/.test(s);

  if (intervalOk) return true;

  // No parens: -infinity, infinity
  if (/^-\s*infinity\s*,\s*infinity$/.test(s)) return true;
  if (/^negative\s+infinity\s*(,|to)\s*(pos\.?\s*)?infinity$/.test(s)) return true;

  // Phrases
  if (s === "all real numbers" || s === "all reals") return true;
  if (s === "r" || s === "the real numbers") return true;
  if (/^entire\s+(real\s+)?line$/.test(s)) return true;
  if (s === "(-infinity,infinity)" || s === "(-inf,inf)") return true;

  // Compact
  const compact = s.replace(/\s/g, "");
  if (compact === "(-infinity,infinity)" || compact === "(-inf,inf)" || compact === "(-∞,∞)")
    return true;

  return false;
}

/**
 * Normalize student interval text for comparison (lowercase, unicode, spaces).
 * @param {string} raw
 * @returns {string}
 */
export function normalizeIntervalText(raw) {
  if (typeof raw !== "string") return "";
  let s = raw.trim().toLowerCase();
  s = s.replace(/\s+/g, " ");
  s = s.replace(/−/g, "-");
  s = s.replace(/∞/g, "infinity");
  s = s.replace(/ℝ/g, "R");
  return s;
}

/**
 * Student answer is the open ray (a, ∞) / (a, infinity) with optional ] and unicode.
 * @param {string} studentAnswer
 * @param {number} a
 */
export function isOpenRayRightInfinity(studentAnswer, a) {
  const s = normalizeIntervalText(studentAnswer).replace(/\s/g, "");
  const aStr = String(a);
  // (a, infinity), (a,inf), (a,∞)
  const re = new RegExp(
    `^\\(\\s*${aStr.replace(".", "\\.")}\\s*,\\s*(infinity|inf)\\s*\\)$`,
    "i"
  );
  if (re.test(s)) return true;
  // Bracket variants
  const re2 = new RegExp(
    `^\\(\\s*${aStr.replace(".", "\\.")}\\s*,\\s*(infinity|inf)\\s*\\]$`,
    "i"
  );
  if (re2.test(s)) return true;
  return false;
}

/**
 * Student answer is the open ray (-∞, a) / (-infinity, a).
 * @param {string} studentAnswer
 * @param {number} a
 */
export function isOpenRayLeftInfinity(studentAnswer, a) {
  const s = normalizeIntervalText(studentAnswer).replace(/\s/g, "");
  const aStr = String(a);
  const re = new RegExp(
    `^\\(\\s*-\\s*(infinity|inf)\\s*,\\s*${aStr.replace(".", "\\.")}\\s*\\)$`,
    "i"
  );
  if (re.test(s)) return true;
  const re2 = new RegExp(
    `^\\[\\s*-\\s*(infinity|inf)\\s*,\\s*${aStr.replace(".", "\\.")}\\s*\\)$`,
    "i"
  );
  if (re2.test(s)) return true;
  return false;
}

/**
 * @param {string} studentAnswer
 * @param {{ mode: 'allReals' } | { mode: 'openLeft', h: number } | { mode: 'openRight', h: number }} spec
 */
export function validateIntervalSpec(studentAnswer, spec) {
  if (!spec || typeof studentAnswer !== "string") return false;
  if (spec.mode === "allReals") return isIncreasingIntervalAllReals(studentAnswer);
  if (spec.mode === "openLeft") return isOpenRayLeftInfinity(studentAnswer, spec.h);
  if (spec.mode === "openRight") return isOpenRayRightInfinity(studentAnswer, spec.h);
  return false;
}
