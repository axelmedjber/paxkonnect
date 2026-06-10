"use server";

import { createElement } from "react";
import { getTranslations } from "next-intl/server";
import { Resend } from "resend";

import { ApplicationConfirmation } from "@/emails/ApplicationConfirmation";
import { ApplicationStatusUpdate } from "@/emails/ApplicationStatusUpdate";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import type { MatchingStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

const defaultFromAddress = "PaxKonnect <onboarding@resend.dev>";

type SendEmailResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

export async function sendApplicationConfirmationEmail(
  opportunityId: string,
  locale: string,
): Promise<SendEmailResult> {
  const t = await getTranslations("emails.application_confirmation");
  const common = await getTranslations("common");
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === "your_resend_key") {
    return { ok: true, skipped: true, reason: t("missing_api_key") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: t("missing_user_email") };
  }

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!opportunity) {
    return { ok: false, error: t("missing_opportunity") };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const dashboardUrl = `${siteUrl}/${locale}/dashboard`;
  const subject = t("subject", { title: opportunity.title });
  const resend = new Resend(apiKey);

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? defaultFromAddress,
    to: user.email,
    subject,
    react: createElement(ApplicationConfirmation, {
      dashboardUrl,
      deadline: formatDate(opportunity.deadline, common("no_deadline"), locale),
      footer: t("footer"),
      heading: t("heading"),
      logo: t("logo"),
      organizer: opportunity.organizer || common("not_specified"),
      organizerLabel: t("organizer_label"),
      deadlineLabel: t("deadline_label"),
      opportunityTitle: opportunity.title,
      opportunityTitleLabel: t("opportunity_title_label"),
      preview: t("preview"),
      trackStatus: t("track_status"),
    }),
  });

  if (emailError) {
    return { ok: false, error: emailError.message };
  }

  return { ok: true };
}

export async function sendWelcomeEmail(email: string, locale: string, origin: string): Promise<SendEmailResult> {
  const t = await getTranslations("emails.welcome");
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === "your_resend_key") {
    return { ok: true, skipped: true, reason: t("missing_api_key") };
  }

  const localizedBaseUrl = `${origin}/${locale}`;
  const resend = new Resend(apiKey);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? defaultFromAddress,
    to: email,
    subject: t("subject"),
    react: createElement(WelcomeEmail, {
      ctaLabel: t("cta"),
      dashboardUrl: `${localizedBaseUrl}/dashboard`,
      email,
      footer: t("footer"),
      intro: t("intro"),
      logo: t("logo"),
      preview: t("preview"),
      steps: [
        {
          href: `${localizedBaseUrl}/profile/edit`,
          label: t("step_profile"),
        },
        {
          href: `${localizedBaseUrl}/opportunities`,
          label: t("step_opportunities"),
        },
        {
          href: `${localizedBaseUrl}/profile/edit#epk`,
          label: t("step_epk"),
        },
      ],
    }),
  });

  if (emailError) {
    return { ok: false, error: emailError.message };
  }

  return { ok: true };
}

export async function sendApplicationStatusEmail({
  locale,
  opportunityTitle,
  status,
  to,
}: Readonly<{
  locale: string;
  opportunityTitle: string;
  status: MatchingStatus;
  to: string;
}>): Promise<SendEmailResult> {
  const t = await getTranslations("emails.application_status");
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === "your_resend_key") {
    return { ok: true, skipped: true, reason: t("missing_api_key") };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const dashboardUrl = `${siteUrl}/${locale}/dashboard`;
  const resend = new Resend(apiKey);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? defaultFromAddress,
    to,
    subject: t("subject", { title: opportunityTitle }),
    react: createElement(ApplicationStatusUpdate, {
      dashboardUrl,
      footer: t("footer"),
      heading: t("heading"),
      intro: t("intro"),
      logo: t("logo"),
      opportunityTitle,
      opportunityTitleLabel: t("opportunity_title_label"),
      preview: t("preview"),
      status: t(`status_${status}`),
      statusLabel: t("status_label"),
      trackStatus: t("track_status"),
    }),
  });

  if (emailError) {
    return { ok: false, error: emailError.message };
  }

  return { ok: true };
}
