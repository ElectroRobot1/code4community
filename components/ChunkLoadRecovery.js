"use client";

import { useEffect } from "react";

function isChunkLoadFailure(reason) {
  const message = String(reason?.message || reason || "");
  const name = String(reason?.name || "");
  return (
    name === "ChunkLoadError" ||
    /Failed to load chunk|Loading chunk \d+ failed|Importing a module script failed/i.test(
      message
    )
  );
}

const RELOAD_KEY = "c4c-chunk-reload";

async function clearCachesAndReload() {
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      /* ignore */
    }
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_cb", String(Date.now()));
  window.location.replace(url.toString());
}

/** After a new deploy, cached HTML/JS can reference chunk files that no longer exist. */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    const tryReload = (reason) => {
      if (!isChunkLoadFailure(reason)) return;
      if (sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.removeItem(RELOAD_KEY);
        return;
      }
      sessionStorage.setItem(RELOAD_KEY, "1");
      void clearCachesAndReload();
    };

    const onError = (event) => {
      tryReload(event.error || event.message);
    };

    const onRejection = (event) => {
      tryReload(event.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
