"use client";

import { useEffect } from "react";

export function PWAServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .catch((error: unknown) => {
        console.error("[pwa service worker]", error);
      });
  }, []);

  return null;
}
