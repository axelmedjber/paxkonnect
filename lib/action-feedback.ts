import "server-only";

import { getTranslations } from "next-intl/server";

import type { ActionFeedbackState } from "@/lib/action-state";

export async function getActionFeedback(scope: string, locale: string) {
  const t = await getTranslations({ locale, namespace: "action_feedback" });

  return {
    error(action: string, detail: string): ActionFeedbackState {
      console.error(`[${scope}] ${action}: ${detail}`);
      return { status: "error", message: t("error", { message: detail }) };
    },
    saved(): ActionFeedbackState {
      return { status: "success", message: t("saved") };
    },
    created(): ActionFeedbackState {
      return { status: "success", message: t("created") };
    },
    deleted(): ActionFeedbackState {
      return { status: "success", message: t("deleted") };
    },
  };
}
