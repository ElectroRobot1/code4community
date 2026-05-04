"use client";

import { useMemo, useState } from "react";

const RED = "#5c1417";

function startOfWeekSunday(d) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtRange(weekStart) {
  const end = addDays(weekStart, 6);
  const left = weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const right = end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${left} - ${right}`;
}

const DEMO_EVENTS = {
  "2025-10-26": [
    { time: "2:00 PM", title: "Chess Club", location: "Library" },
    { time: "3:30 PM", title: "Photography Walk", location: "Main Quad" },
  ],
  "2025-10-27": [
    { time: "12:00 PM", title: "Gender Sexuality Alliance Meeting", location: "LLC 304/305" },
    { time: "12:00 PM", title: "Math Club Meeting", location: "RH 200" },
    { time: "3:15 PM", title: "Debate Team Practice", location: "Room 112" },
  ],
  "2025-10-28": [
    { time: "11:00 AM", title: "Environmental Club", location: "Science Wing" },
    { time: "4:00 PM", title: "Audio Engineering Club Meeting", location: "PAC 2", highlight: true },
  ],
  "2025-10-29": [{ time: "12:30 PM", title: "Yearbook Committee", location: "Art Room" }],
  "2025-10-30": [
    {
      time: "1:00 PM",
      title: "Red Cross Club Event",
      location: "Gymnasium",
      variant: "accent",
      note: "Please check Related Resources for volunteer forms.",
    },
    { time: "3:00 PM", title: "Robotics A Team", location: "Maker Lab" },
  ],
  "2025-10-31": [{ time: "10:00 AM", title: "Spirit Club Planning", location: "Student Life" }],
  "2025-11-01": [{ time: "9:00 AM", title: "Community Service Day", location: "Front Circle" }],
};

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const shortDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ChevronLeft() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

/** Compact flat blocks: padding 8px 6px, margin 4px 8px; time normal, title bold, location small */
function EventBlock({ ev, isSelectedCol }) {
  const accent = ev.variant === "accent";
  const hi = ev.highlight;

  let box =
    "mx-2 my-1 border border-neutral-300 bg-neutral-100 px-1.5 py-2 text-center rounded-none";
  if (accent) {
    box = "mx-2 my-1 border border-rose-400 bg-rose-50 px-1.5 py-2 text-center rounded-none";
  } else if (hi) {
    box = isSelectedCol
      ? "mx-2 my-1 border-2 border-neutral-900 bg-white px-1.5 py-2 text-center rounded-none"
      : "mx-2 my-1 border-2 border-neutral-900 bg-neutral-100 px-1.5 py-2 text-center rounded-none";
  } else if (isSelectedCol) {
    box = "mx-2 my-1 border border-neutral-300 bg-white px-1.5 py-2 text-center rounded-none";
  }

  const timeCls = accent
    ? "text-[12px] font-normal leading-tight text-rose-900"
    : "text-[12px] font-normal leading-tight text-neutral-800";
  const titleCls = accent
    ? "mt-0.5 text-[12px] font-bold leading-snug text-rose-950"
    : "mt-0.5 text-[12px] font-bold leading-snug text-neutral-900";
  const locCls = accent ? "mt-0.5 text-[10px] leading-snug text-rose-800" : "mt-0.5 text-[10px] leading-snug text-neutral-600";
  const noteCls = "mt-1 text-[9px] leading-snug text-rose-900/90";

  return (
    <div className={box}>
      <p className={timeCls}>{ev.time}</p>
      <p className={titleCls}>{ev.title}</p>
      <p className={locCls}>{ev.location}</p>
      {ev.note ? <p className={noteCls}>{ev.note}</p> : null}
    </div>
  );
}

export default function ClubHubWeekCalendar() {
  const [anchor] = useState(() => new Date(2025, 9, 27));
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState("week");

  const weekStart = useMemo(() => {
    const base = startOfWeekSunday(anchor);
    return addDays(base, weekOffset * 7);
  }, [anchor, weekOffset]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const demoWeekStart = useMemo(() => {
    const d = new Date(2025, 9, 26);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const isDemoWeek = weekStart.getTime() === demoWeekStart;
  const selectedIndex = isDemoWeek ? 1 : -1;

  const navBtn =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5c1417] text-white transition-colors hover:bg-[#731a1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c1417] focus-visible:ring-offset-1";

  const toggleBtn = (active) =>
    active
      ? "rounded-sm border border-transparent bg-[#5c1417] px-4 py-1 text-xs font-semibold text-white"
      : "rounded-sm border border-[#5c1417] bg-white px-4 py-1 text-xs font-semibold text-[#5c1417] hover:bg-rose-50";

  return (
    <div className="w-full">
      {/* Full-width schedule board — maroon section only shows where content doesn’t cover */}
      <div className="border-b border-neutral-400 bg-white shadow-sm">
        {/* Big title banner */}
        <div
          className="flex min-h-[72px] items-center justify-center px-4 py-3 sm:min-h-[80px] sm:py-3.5"
          style={{
            backgroundColor: RED,
            backgroundImage:
              "linear-gradient(rgba(92,20,23,0.82), rgba(92,20,23,0.88)), url(/Broad_Run_HS_Ashburn_VA_20147_ext2.JPG)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        >
          <h2 className="text-center font-black leading-none tracking-tight text-white drop-shadow-sm sm:drop-shadow md:tracking-tight">
            <span className="block text-[clamp(2.25rem,5.5vw,3.5rem)]">Calendar</span>
          </h2>
        </div>

        {/* Date row: arrows left/right edge, date centered */}
        <div className="relative border-b border-neutral-300 bg-white px-2 py-2.5 sm:px-4 sm:py-3">
          <button type="button" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)} className={`${navBtn} absolute left-2 top-1/2 z-10 -translate-y-1/2 sm:left-4`}>
            <ChevronLeft />
          </button>
          <p className="mx-auto max-w-[calc(100%-5rem)] px-10 text-center text-sm font-semibold leading-snug text-[#5c1417] sm:max-w-none sm:px-14 sm:text-base">
            {fmtRange(weekStart)}
          </p>
          <button type="button" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)} className={`${navBtn} absolute right-2 top-1/2 z-10 -translate-y-1/2 sm:right-4`}>
            <ChevronRight />
          </button>
        </div>

        {/* Week / Month centered under date */}
        <div className="flex justify-center gap-2 border-b border-neutral-300 bg-white px-3 py-2">
          <button type="button" onClick={() => setView("week")} className={toggleBtn(view === "week")}>
            Week
          </button>
          <button type="button" onClick={() => setView("month")} className={toggleBtn(view === "month")}>
            Month
          </button>
        </div>

        {/* Body — height follows content; grid uses fixed tall column area only */}
        <div className="bg-white">
          {view === "month" ? (
            <p className="border-t border-neutral-200 py-12 text-center text-sm text-neutral-600">Month view will be available in a future update.</p>
          ) : (
            <>
              <div className="hidden border-t border-neutral-300 lg:grid lg:h-[640px] lg:grid-cols-7 lg:gap-0">
                {days.map((day, colIdx) => {
                  const key = dateKey(day);
                  const list = DEMO_EVENTS[key] || [];
                  const isSelected = selectedIndex >= 0 && colIdx === selectedIndex;
                  const dateStr = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                  return (
                    <div
                      key={key}
                      className={`flex min-h-0 min-w-0 flex-col border-r border-neutral-300 last:border-r-0 ${
                        isSelected ? "" : "bg-white"
                      }`}
                      style={isSelected ? { backgroundColor: RED } : undefined}
                    >
                      <div className={`shrink-0 border-b border-neutral-300 px-1 py-2 text-center ${isSelected ? "border-white/25" : ""}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isSelected ? "text-white" : "text-[#5c1417]"}`}>
                          {shortDay[colIdx].slice(0, 3).toUpperCase()}
                        </div>
                        <div className={`mt-1 text-[12px] font-semibold leading-none ${isSelected ? "text-white" : "text-neutral-900"}`}>{dateStr}</div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto pt-1">
                        {list.length === 0 ? (
                          <p className={`py-6 text-center text-[10px] ${isSelected ? "text-white/60" : "text-neutral-400"}`}>No events</p>
                        ) : (
                          list.map((ev, i) => <EventBlock key={`${key}-${i}`} ev={ev} isSelectedCol={isSelected} />)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile: stacked */}
              <div className="flex flex-col gap-0 divide-y divide-neutral-300 border-t border-neutral-300 lg:hidden">
                {days.map((day, colIdx) => {
                  const key = dateKey(day);
                  const list = DEMO_EVENTS[key] || [];
                  const isSelected = selectedIndex >= 0 && colIdx === selectedIndex;
                  const dateStr = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                  return (
                    <div key={key} className="bg-white" style={isSelected ? { backgroundColor: RED } : undefined}>
                      <div className={`flex items-center justify-between border-b border-neutral-300 px-3 py-2 ${isSelected ? "border-white/25" : "bg-neutral-50"}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isSelected ? "text-white" : "text-[#5c1417]"}`}>
                          {shortDay[colIdx].slice(0, 3).toUpperCase()}
                        </span>
                        <span className={`text-[12px] font-semibold ${isSelected ? "text-white" : "text-neutral-900"}`}>{dateStr}</span>
                      </div>
                      <div className="space-y-0 py-1">
                        {list.length === 0 ? (
                          <p className={`py-4 text-center text-[10px] ${isSelected ? "text-white/70" : "text-neutral-400"}`}>No events</p>
                        ) : (
                          list.map((ev, i) => <EventBlock key={`${key}-m-${i}`} ev={ev} isSelectedCol={isSelected} />)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
