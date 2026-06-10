"use client";

import { Share2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ShareProfileButton() {
  const t = useTranslations("artist_profile");

  async function shareProfile() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(t("share_success"));
  }

  return (
    <Button type="button" variant="secondary" onClick={() => void shareProfile()}>
      <Share2Icon data-icon="inline-start" />
      {t("share_profile")}
    </Button>
  );
}
