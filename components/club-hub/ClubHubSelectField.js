"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
/**
 * @param {{
 *   id: string;
 *   value: string;
 *   onChange: (value: string) => void;
 *   options: { value: string; label: string }[];
 *   placeholder?: string;
 *   disabled?: boolean;
 * }} props
 */
export default function ClubHubSelectField({
  id,
  value,
  onChange,
  options,
  placeholder = "— Select a club —",
  disabled = false,
}) {
  const listboxId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? (value ? value : null);
  const triggerText = selectedLabel || placeholder;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (next) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative mt-1.5 min-w-0">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-300 bg-white px-3 py-3 text-left text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "ring-2 ring-[#5c1417] ring-offset-2" : ""
        } ${clubHubButtonFocusClass}`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${selectedLabel ? "text-neutral-900" : "text-neutral-500"}`}
        >
          {triggerText}
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 text-sm shadow-lg"
        >
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => pick("")}
              className={`block w-full px-3 py-2.5 text-left hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5c1417] ${
                value === "" ? "bg-neutral-50 font-medium text-neutral-900" : "text-neutral-700"
              }`}
            >
              {placeholder}
            </button>
          </li>
          {options.map((opt) => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => pick(opt.value)}
                className={`block w-full px-3 py-2.5 text-left hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5c1417] ${
                  value === opt.value
                    ? "bg-neutral-50 font-medium text-neutral-900"
                    : "text-neutral-900"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
