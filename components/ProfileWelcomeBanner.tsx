"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const storageKey = "paxkonnect-profile-welcome-dismissed";
const getInitialVisibility = (show: boolean) =>
  show && (typeof window === "undefined" || localStorage.getItem(storageKey) !== "true");

type ProfileWelcomeBannerProps = {
  show: boolean;
};

export function ProfileWelcomeBanner({ show }: ProfileWelcomeBannerProps) {
  const t = useTranslations("profile_edit");
  const [isVisible, setIsVisible] = useState(() => getInitialVisibility(show));

  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-primary/20 bg-secondary p-4 text-secondary-foreground">
      <p className="text-sm font-medium">{t("welcome_banner")}</p>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={t("dismiss_welcome")}
        onClick={() => {
          localStorage.setItem(storageKey, "true");
          setIsVisible(false);
        }}
      >
        <XIcon data-icon="inline-start" />
      </Button>
    </div>
  );
}
