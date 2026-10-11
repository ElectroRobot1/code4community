export const CLUB_HUB_OPPORTUNITY_EVENTS = "clubHubOpportunityEvents";

/**
 * @param {unknown} url
 */
export function normalizeOpportunitySignUpUrl(url) {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw.slice(0, 2048);
}

/**
 * @param {unknown} dateStr
 */
export function normalizeOpportunityEventDate(dateStr) {
  const raw = typeof dateStr === "string" ? dateStr.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return raw;
}

/**
 * @param {unknown} title
 */
export function normalizeOpportunityTitle(title) {
  return typeof title === "string" ? title.trim().slice(0, 120) : "";
}

/**
 * @param {unknown} description
 */
export function normalizeOpportunityDescription(description) {
  return typeof description === "string" ? description.trim().slice(0, 500) : "";
}

const URL_IN_TEXT_RE = /(https?:\/\/[^\s]+)/g;

/** @param {string} text */
export function splitDescriptionWithLinks(text) {
  if (!text) return [];
  /** @type {{ type: "text" | "link", value: string }[]} */
  const parts = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_IN_TEXT_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    parts.push({ type: "link", value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts.length ? parts : [{ type: "text", value: text }];
}
