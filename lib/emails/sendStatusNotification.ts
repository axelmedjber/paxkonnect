import { createElement } from "react";
import { Resend } from "resend";

import { ApplicationStatusEmail } from "@/emails/ApplicationStatus";
import { sendPushToProfile } from "@/lib/notifications/push";

type SendStatusNotificationParams = {
  artistName: string;
  locale: string;
  opportunityTitle: string;
  organizer: string;
  profileId: string;
  status: "accepted" | "rejected";
  to: string;
};

export async function sendStatusNotification({
  artistName,
  locale,
  opportunityTitle,
  organizer,
  profileId,
  status,
  to,
}: SendStatusNotificationParams) {
  const pushPayload =
    status === "accepted"
      ? {
          body: `Votre candidature pour ${opportunityTitle} a été acceptée`,
          title: "🎉 Candidature acceptée !",
          url: `/${locale}/dashboard`,
        }
      : {
          body: "Votre candidature n'a pas été retenue cette fois",
          title: `Candidature pour ${opportunityTitle}`,
          url: `/${locale}/opportunities`,
        };

  try {
    await sendPushToProfile(profileId, pushPayload);
  } catch (error) {
    console.error("[status notification push]", error);
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { ok: true, skipped: true, reason: "RESEND_API_KEY is not configured." };
  }

  const resend = new Resend(apiKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const subject =
    status === "accepted"
      ? `Candidature acceptee - ${opportunityTitle}`
      : `Candidature pour ${opportunityTitle}`;
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    react: createElement(ApplicationStatusEmail, {
      artistName,
      dashboardUrl: `${siteUrl}/${locale}/dashboard`,
      opportunityTitle,
      organizer,
      status,
    }),
    subject,
    to,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
