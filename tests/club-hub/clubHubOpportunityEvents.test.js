import { describe, expect, it } from "vitest";
import {
  normalizeOpportunityEventDate,
  normalizeOpportunitySignUpUrl,
  normalizeOpportunityTitle,
  splitDescriptionWithLinks,
} from "@/lib/club-hub/clubHubOpportunityEvents";

describe("clubHubOpportunityEvents normalize", () => {
  it("accepts https sign-up URLs", () => {
    expect(normalizeOpportunitySignUpUrl("https://forms.gle/example")).toBe(
      "https://forms.gle/example",
    );
  });

  it("rejects non-http URLs", () => {
    expect(normalizeOpportunitySignUpUrl("javascript:alert(1)")).toBe("");
  });

  it("validates event dates", () => {
    expect(normalizeOpportunityEventDate("2026-10-31")).toBe("2026-10-31");
    expect(normalizeOpportunityEventDate("10/31/2026")).toBe("");
  });

  it("trims titles", () => {
    expect(normalizeOpportunityTitle("  Freshmo workshop  ")).toBe("Freshmo workshop");
  });

  it("splits description URLs into link segments", () => {
    const parts = splitDescriptionWithLinks("Sign up at https://forms.gle/abc today");
    expect(parts.some((p) => p.type === "link" && p.value.startsWith("https://"))).toBe(true);
  });
});
