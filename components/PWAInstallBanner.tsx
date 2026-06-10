"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-banner-dismissed");

    if (dismissed) {
      return;
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    if (isStandalone) {
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }

    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setShowBanner(false);
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-purple-600 p-4 text-white shadow-lg md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center gap-3">
        <Image src="/icons/icon-72.png" alt="PaxKonnect" width={40} height={40} className="rounded-lg" />
        <div>
          <p className="text-sm font-medium">{t("install_title")}</p>
          <p className="text-xs text-purple-200">{t("install_description")}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleDismiss} className="px-2 py-1 text-xs text-purple-200 hover:text-white">
          {t("dismiss")}
        </button>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50"
        >
          {t("install")}
        </button>
      </div>
    </div>
  );
}
