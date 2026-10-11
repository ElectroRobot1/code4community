"use client";

import { useLayoutEffect } from "react";
import ClubHubResourcesContent from "@/components/club-hub/ClubHubResourcesContent";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import ClubHubSkipLink from "@/components/club-hub/ClubHubSkipLink";
import { CLUB_HUB_MAIN_ID } from "@/lib/club-hub/a11y";

export default function ClubHubResourcesPage() {
  useLayoutEffect(() => {
    document.title = "Broad Run Club Hub | Opportunities & resources";
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <ClubHubSkipLink />
      <ClubHubNav active={null} loginRedirect="/club-hub/resources" />

      <main
        id={CLUB_HUB_MAIN_ID}
        className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-12"
      >
        <ClubHubResourcesContent />
      </main>
    </div>
  );
}
