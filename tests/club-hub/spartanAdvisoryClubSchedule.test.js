import { describe, expect, it } from "vitest";
import {
  mergeSpartanScheduleIntoEventsByDate,
  SPARTAN_ADVISORY_CLUB_SCHEDULE,
} from "@/lib/club-hub/spartanAdvisoryClubSchedule2026";

describe("spartanAdvisoryClubSchedule2026", () => {
  it("includes all published schedule rows", () => {
    expect(SPARTAN_ADVISORY_CLUB_SCHEDULE.length).toBe(39);
  });

  it("merges gold and planned events into the calendar map", () => {
    const merged = mergeSpartanScheduleIntoEventsByDate({}, "2026-10-01", "2026-10-31");
    expect(merged["2026-10-14"]?.some((e) => e.title === "Gold club meeting")).toBe(true);
    expect(merged["2026-10-28"]?.some((e) => e.title === "T.H.I.N.K Before You Speak")).toBe(true);
  });

  it("does not show A/B day labels on Spartan schedule cards", () => {
    const merged = mergeSpartanScheduleIntoEventsByDate({}, "2026-10-01", "2026-10-31");
    const gold = merged["2026-10-14"]?.find((e) => e.title === "Gold club meeting");
    const maroon = merged["2026-10-21"]?.find((e) => e.title === "Maroon club meeting");
    const planned = merged["2026-10-28"]?.find((e) => e.title === "T.H.I.N.K Before You Speak");
    expect(gold?.time).toBe("");
    expect(maroon?.time).toBe("");
    expect(planned?.time).toBe("");
  });
});
