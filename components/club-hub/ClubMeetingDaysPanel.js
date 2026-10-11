"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/utils/AuthContext";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import {
  canPickClubForGoldMeetingDay,
  canPickClubForMaroonMeetingDay,
} from "@/lib/club-hub/meetingDayBoardAccess";
import {
  fetchMeetingChoices,
  getMeetingChoiceSwitchError,
  saveMeetingChoices,
} from "@/lib/club-hub/clubMeetingChoices";
import { notifyMeetingChoicesSheetSync } from "@/lib/club-hub/notifyMeetingChoicesSheetSync";
import { fetchMembershipsForUser } from "@/lib/club-hub/clubMemberships";
import ClubHubSelectField from "@/components/club-hub/ClubHubSelectField";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

export default function ClubMeetingDaysPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [memberships, setMemberships] = useState([]);
  const [goldClubSlug, setGoldClubSlug] = useState("");
  const [maroonClubSlug, setMaroonClubSlug] = useState("");
  const [savedChoices, setSavedChoices] = useState({
    goldClubSlug: "",
    maroonClubSlug: "",
    choicesUpdatedAt: null,
  });

  const switchCooldownError = useMemo(
    () =>
      getMeetingChoiceSwitchError(
        savedChoices,
        { goldClubSlug, maroonClubSlug },
        savedChoices.choicesUpdatedAt,
      ),
    [savedChoices, goldClubSlug, maroonClubSlug],
  );

  const joinedSlugs = useMemo(
    () => new Set(memberships.map((m) => m.clubSlug)),
    [memberships],
  );

  const goldOptions = useMemo(
    () => memberships.filter((m) => canPickClubForGoldMeetingDay(m)),
    [memberships],
  );

  const maroonOptions = useMemo(
    () => memberships.filter((m) => canPickClubForMaroonMeetingDay(m)),
    [memberships],
  );

  const goldSelectOptions = useMemo(
    () =>
      goldOptions.map((m) => ({
        value: m.clubSlug,
        label: m.clubName || m.clubSlug,
      })),
    [goldOptions],
  );

  const maroonSelectOptions = useMemo(
    () =>
      maroonOptions.map((m) => ({
        value: m.clubSlug,
        label: m.clubName || m.clubSlug,
      })),
    [maroonOptions],
  );

  useEffect(() => {
    const uid = user?.uid;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [rows, choices] = await Promise.all([
          fetchMembershipsForUser(uid),
          fetchMeetingChoices(uid),
        ]);
        if (cancelled) return;
        setMemberships(rows);
        const goldOpts = rows.filter((m) => canPickClubForGoldMeetingDay(m));
        const maroonOpts = rows.filter((m) => canPickClubForMaroonMeetingDay(m));
        const nextGold = goldOpts.some((m) => m.clubSlug === choices.goldClubSlug)
          ? choices.goldClubSlug
          : "";
        const nextMaroon = maroonOpts.some((m) => m.clubSlug === choices.maroonClubSlug)
          ? choices.maroonClubSlug
          : "";
        setGoldClubSlug(nextGold);
        setMaroonClubSlug(nextMaroon);
        setSavedChoices({
          goldClubSlug: nextGold,
          maroonClubSlug: nextMaroon,
          choicesUpdatedAt: choices.choicesUpdatedAt,
        });
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load your clubs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.uid || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveMeetingChoices({
        userId: user.uid,
        goldClubSlug,
        maroonClubSlug,
        joinedSlugs,
        memberships,
      });
      const refreshed = await fetchMeetingChoices(user.uid);
      setSavedChoices({
        goldClubSlug: refreshed.goldClubSlug,
        maroonClubSlug: refreshed.maroonClubSlug,
        choicesUpdatedAt: refreshed.choicesUpdatedAt,
      });
      await notifyMeetingChoicesSheetSync(user);
      setMessage("Meeting day clubs saved.");
    } catch (err) {
      setError(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-neutral-700">
        <Link href="/login?redirectTo=%2Fclub-hub%2Fmeeting-days" className="text-[#5c1417] underline">
          Log in
        </Link>{" "}
        to choose your Gold and Maroon Club Selections.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-700">Loading…</p>;
  }

  return (
    <div className="space-y-5">
      <ClubHubLiveMessage message={switchCooldownError} variant="alert" />
      <ClubHubLiveMessage message={error} variant="alert" />
      <ClubHubLiveMessage message={message} />

      {memberships.length === 0 ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-neutral-800">
          You have not joined any clubs yet.{" "}
          <Link href="/club-hub/directory" className="font-semibold text-[#5c1417] hover:underline">
            Browse the directory
          </Link>{" "}
          and use Join club on a club page.
        </p>
      ) : null}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          <div className="min-w-0">
            <label htmlFor="gold-club" className="block text-sm font-semibold text-neutral-900">
              Gold day club
            </label>
            <ClubHubSelectField
              id="gold-club"
              value={goldClubSlug}
              onChange={setGoldClubSlug}
              options={goldSelectOptions}
            />
            {memberships.length > 0 && goldOptions.length === 0 ? (
              <p className="mt-1 text-sm text-neutral-700">
                None of your joined clubs meet on Gold days.
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <label htmlFor="maroon-club" className="block text-sm font-semibold text-neutral-900">
              Maroon day club
            </label>
            <ClubHubSelectField
              id="maroon-club"
              value={maroonClubSlug}
              onChange={setMaroonClubSlug}
              options={maroonSelectOptions}
            />
            {memberships.length > 0 && maroonOptions.length === 0 ? (
              <p className="mt-1 text-sm text-neutral-700">
                None of your joined clubs meet on Maroon days.
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || Boolean(switchCooldownError)}
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto ${clubHubButtonFocusClass}`}
          style={{ backgroundColor: CLUB_HUB_MAROON }}
        >
          {saving ? "Saving…" : "Save choices"}
        </button>
      </form>
    </div>
  );
}
