"use client";

import { CheckIcon, LoaderCircleIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { sendApplicationConfirmationEmail } from "@/app/actions/sendEmail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type ApplyOpportunityButtonProps = {
  alreadyApplied: boolean;
  opportunityId: string;
  userId: string | null;
};

export function ApplyOpportunityButton({
  alreadyApplied,
  opportunityId,
  userId,
}: ApplyOpportunityButtonProps) {
  const t = useTranslations("opportunity_detail");
  const locale = useLocale();
  const router = useRouter();
  const [isApplied, setIsApplied] = useState(alreadyApplied);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function apply() {
    if (!userId) {
      window.location.assign(`/${locale}/auth`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.from("matchings").insert({
      profile_id: userId,
      opportunity_id: opportunityId,
      status: "pending",
      message: null,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setIsApplied(true);
        router.refresh();
        return;
      }

      setErrorMessage(error.message);
      return;
    }

    const emailResult = await sendApplicationConfirmationEmail(opportunityId, locale);

    if (!emailResult.ok) {
      setErrorMessage(emailResult.error);
    }

    setIsApplied(true);
    router.refresh();
  }

  if (alreadyApplied) {
    return (
      <Badge className="w-fit border-transparent bg-secondary text-secondary-foreground">
        {t("already_applied")}
      </Badge>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        type="button"
        className={isApplied ? "bg-green-600 text-white hover:bg-green-600" : undefined}
        disabled={isSubmitting || isApplied}
        onClick={() => void apply()}
      >
        {isSubmitting ? (
          <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
        ) : null}
        {isApplied ? (
          <>
            {t("applied")}
            <CheckIcon data-icon="inline-end" />
          </>
        ) : (
          t("apply")
        )}
      </Button>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
