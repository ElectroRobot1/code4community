"use client";

import { useEffect } from "react";

/** Scroll to #hash on /work after load (client-only; page is otherwise server-rendered). */
export default function WorkHashScroll() {
  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    document.getElementById(raw)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return null;
}
