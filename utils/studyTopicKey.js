/**
 * Canonical key for topic weakness + per-session coverage counts.
 * Lowercase, trimmed — merges "Japan", "japan", "Japan ".
 */
export function normalizeStudyTopicKey(raw) {
  if (typeof raw !== "string") return "general topic";
  let s = raw.replace(/\s+/g, " ").trim().toLowerCase();
  s = s.replace(/[.,;:!?]+$/g, "").trim();
  if (!s) return "general topic";
  return s.slice(0, 80);
}

/** Skip tracking when the model didn't name a real subtopic. */
export function shouldSkipTopicWeaknessKey(key) {
  const k = typeof key === "string" ? key.trim().toLowerCase() : "";
  return k === "" || k === "general topic" || k.length < 2;
}

/** Title-case words for prompts (keys are stored lowercase). */
export function formatStudyTopicKeyForPrompt(key) {
  if (typeof key !== "string" || !key.trim()) return "";
  return key
    .trim()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}
