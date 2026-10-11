import Link from "next/link";
import ClubHubOpportunitiesSection from "@/components/club-hub/ClubHubOpportunitiesSection";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import {
  CLUB_HUB_NEW_CLUB_CONTACT,
  CLUB_HUB_RESOURCE_LINKS,
} from "@/lib/club-hub/clubHubResourceLinks";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

const resourceBtnClass = `flex min-h-[3.25rem] items-center justify-center rounded-md px-3 py-2.5 text-center text-sm font-semibold leading-snug text-white transition-opacity hover:opacity-95 sm:min-h-[3.5rem] sm:text-[15px] ${clubHubButtonFocusClass}`;

export default function ClubHubResourcesContent() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-[1.75rem]">
          Opportunities &amp; resources
        </h1>
      </header>

      <ClubHubOpportunitiesSection />

      <section aria-labelledby="club-resources-links-heading">
        <h2 id="club-resources-links-heading" className="text-lg font-bold text-neutral-900">
          Club resources
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CLUB_HUB_RESOURCE_LINKS.map((item) => (
            <li key={item.href}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={resourceBtnClass}
                  style={{ backgroundColor: CLUB_HUB_MAROON }}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className={resourceBtnClass}
                  style={{ backgroundColor: CLUB_HUB_MAROON }}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="border-t border-neutral-200 pt-6 text-sm font-semibold leading-relaxed text-neutral-900">
        Contact {CLUB_HUB_NEW_CLUB_CONTACT.name} via email (
        <a
          href={`mailto:${CLUB_HUB_NEW_CLUB_CONTACT.email}`}
          className={`text-[#5c1417] hover:underline ${clubHubButtonFocusClass}`}
        >
          {CLUB_HUB_NEW_CLUB_CONTACT.email}
        </a>
        ) if you are interested in starting a club. The deadline to submit a club proposal for the
        2026–27 school year is {CLUB_HUB_NEW_CLUB_CONTACT.proposalDeadline}.
      </p>
    </div>
  );
}
