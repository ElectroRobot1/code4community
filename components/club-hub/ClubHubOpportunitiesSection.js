"use client";

import { useEffect, useState } from "react";
import ClubHubOpportunityDescription from "@/components/club-hub/ClubHubOpportunityDescription";
import { fetchPublicClubHubOpportunityEvents } from "@/lib/club-hub/clubHubOpportunityEventsClient";

function formatEventDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClubHubOpportunitiesSection() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchPublicClubHubOpportunityEvents();
        if (!cancelled) setEvents(rows);
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setError(err instanceof Error ? err.message : "Could not load events.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="club-opportunities-heading">
      <h2 id="club-opportunities-heading" className="text-lg font-bold text-neutral-900">
        Upcoming opportunities
      </h2>
      {loading ? (
        <p className="mt-2 text-sm text-neutral-700" role="status">
          Loading…
        </p>
      ) : error ? (
        <p className="mt-2 text-sm text-neutral-700">{error}</p>
      ) : events.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-700">No upcoming events posted yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="rounded-[14px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5"
            >
              <p className="font-bold text-neutral-900">{ev.title}</p>
              {ev.eventDate ? (
                <p className="mt-1 text-sm text-neutral-700">{formatEventDate(ev.eventDate)}</p>
              ) : null}
              {ev.description ? (
                <ClubHubOpportunityDescription
                  text={ev.description}
                  className="mt-2 text-sm text-neutral-700"
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
