"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const merriweatherStyle = { fontFamily: "'Merriweather', Georgia, serif" };

function TeamMemberCard({ member, onOpen }) {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => onOpen(member)}
        aria-label={`Open profile for ${member.name}`}
        className="group flex w-fit max-w-full flex-col items-center rounded-lg p-1 text-center transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="mb-3 h-40 w-40 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
          <Image
            src={member.image}
            alt=""
            width={160}
            height={160}
            className="h-full w-full object-cover"
          />
        </div>
        <h3
          className="mb-1 text-lg font-semibold text-foreground decoration-foreground underline-offset-4 group-hover:underline"
          style={merriweatherStyle}
        >
          {member.name}
        </h3>
        <p className="text-sm text-muted-foreground">{member.role}</p>
      </button>
    </div>
  );
}

export default function AboutTeamSection({ leadership, members }) {
  const [modalMember, setModalMember] = useState(null);

  useEffect(() => {
    if (!modalMember) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setModalMember(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalMember]);

  return (
    <>
      <div className="bg-background border-t border-border py-12 md:py-14 px-6">
        <div className="max-w-3xl mx-auto md:max-w-4xl">
          <h2
            className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8 md:mb-9"
            style={merriweatherStyle}
          >
            Code4Community Team
          </h2>

          <div className="mb-5 grid grid-cols-1 gap-x-0.5 gap-y-4 sm:grid-cols-3 sm:gap-x-1 sm:gap-y-3 md:mb-6">
            {leadership.map((member) => (
              <TeamMemberCard key={member.name} member={member} onOpen={setModalMember} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-0.5 gap-y-3 md:grid-cols-4 md:gap-x-1 md:gap-y-2.5">
            {members.map((member) => (
              <TeamMemberCard key={member.name} member={member} onOpen={setModalMember} />
            ))}
          </div>
        </div>
      </div>

      {modalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 z-0 bg-black/50"
            onClick={() => setModalMember(null)}
            aria-label="Close dialog"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-modal-title"
            className="relative z-10 w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-xl md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalMember(null)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <span className="text-xl leading-none" aria-hidden>
                ×
              </span>
            </button>
            <div className="grid gap-8 pt-2 md:grid-cols-[minmax(0,200px)_1fr] md:items-start md:gap-10">
              <div className="mx-auto flex max-w-[200px] flex-col items-center text-center md:mx-0">
                <div className="mb-4 aspect-square w-full max-w-[180px] overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src={modalMember.image}
                    alt={modalMember.name}
                    width={180}
                    height={180}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3
                  id="team-modal-title"
                  className="mb-1 text-lg font-semibold text-foreground md:text-xl"
                  style={merriweatherStyle}
                >
                  {modalMember.name}
                </h3>
                <p className="text-sm text-muted-foreground">{modalMember.role}</p>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {modalMember.bio}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
