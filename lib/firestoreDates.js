/** Normalize Firestore Timestamp / plain objects / ISO strings to Date. */
export function firestoreToDate(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatRequestTime(value, fallback = "Unknown time") {
  const d = firestoreToDate(value);
  if (!d) return fallback;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatRequestDateTime(value, fallback = "Recently") {
  const d = firestoreToDate(value);
  if (!d) return fallback;
  return d.toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

/** Writing Center session list dates (Firestore Timestamp-safe). */
export function formatSessionDate(value, fallback = "—") {
  const d = firestoreToDate(value);
  if (!d) return fallback;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
