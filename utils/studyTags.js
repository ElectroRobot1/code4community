/** Human-readable labels for adaptive quiz prompts (History / Science). */

export const HISTORY_SKILL_TAGS = {
  cause_effect: "Cause & effect",
  continuity_change: "Continuity & change",
  comparison: "Comparison across places or periods",
  significance: "Significance & outcomes",
  evidence_interpretation: "Evidence & interpretation",
  periodization: "Periodization & context",
  general: "General historical reasoning",
};

export const SCIENCE_SKILL_TAGS = {
  mechanism: "Mechanisms & processes",
  models_limits: "Models & limitations",
  experimental_logic: "Experimental logic & controls",
  scale_energy: "Scale, energy & matter flow",
  systems_interaction: "Systems & interactions",
  data_inference: "Data & inference",
  general: "General scientific reasoning",
};

const HISTORY_KEYS = new Set(Object.keys(HISTORY_SKILL_TAGS));
const SCIENCE_KEYS = new Set(Object.keys(SCIENCE_SKILL_TAGS));

/**
 * @param {"history" | "science"} subject
 * @param {unknown} raw
 */
export function normalizeSkillTag(subject, raw) {
  const allowed = subject === "science" ? SCIENCE_KEYS : HISTORY_KEYS;
  if (typeof raw !== "string") return "general";
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (allowed.has(key)) return key;
  return "general";
}

/**
 * @param {"history" | "science"} subject
 */
export function skillTagListForPrompt(subject) {
  const map = subject === "science" ? SCIENCE_SKILL_TAGS : HISTORY_SKILL_TAGS;
  return Object.entries(map)
    .filter(([k]) => k !== "general")
    .map(([k, label]) => `"${k}" (${label})`);
}

/**
 * @param {"history" | "science"} subject
 * @param {string[]} weakTagKeys
 */
export function weakTagsHumanReadable(subject, weakTagKeys) {
  const map = subject === "science" ? SCIENCE_SKILL_TAGS : HISTORY_SKILL_TAGS;
  if (!Array.isArray(weakTagKeys) || weakTagKeys.length === 0) return [];
  return weakTagKeys.map((k) => map[k] || k).filter(Boolean);
}
