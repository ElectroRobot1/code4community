import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { splitDescriptionWithLinks } from "@/lib/club-hub/clubHubOpportunityEvents";

/** @param {{ text: string, className?: string }} props */
export default function ClubHubOpportunityDescription({ text, className = "" }) {
  const parts = splitDescriptionWithLinks(text);
  return (
    <p className={`whitespace-pre-wrap ${className}`.trim()}>
      {parts.map((part, i) =>
        part.type === "link" ? (
          <a
            key={`${part.value}-${i}`}
            href={part.value}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium text-[#5c1417] underline underline-offset-2 ${clubHubButtonFocusClass}`}
          >
            {part.value}
          </a>
        ) : (
          <span key={`t-${i}`}>{part.value}</span>
        ),
      )}
    </p>
  );
}
