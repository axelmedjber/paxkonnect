import "server-only";

import { createElement } from "react";
import { Resend } from "resend";

import { NewOpportunityEmail } from "@/emails/NewOpportunity";
import { sendPushToProfiles } from "@/lib/notifications/push";
import { createUnsubscribeToken } from "@/lib/notifications/unsubscribeToken";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Opportunity, OpportunityCategory, Profile } from "@/lib/types";

type ArtistAlertProfile = Pick<
  Profile,
  "artistic_disciplines" | "full_name" | "id" | "notifications_opt_out" | "stage_name"
>;

type ArtistRecipient = ArtistAlertProfile & {
  email: string;
};

const categoryDisciplineMap: Record<OpportunityCategory, string[]> = {
  contest: ["music", "visual arts", "theatre", "dance", "literature", "film", "other"],
  event: ["music", "visual arts", "theatre", "dance", "film", "other"],
  other: ["music", "visual arts", "theatre", "dance", "literature", "film", "other"],
  podcast: ["music", "theatre", "literature", "other"],
  radio: ["music"],
  residency: ["music", "visual arts", "theatre", "dance", "literature", "film", "other"],
};

function truncate(value: string | null, length: number) {
  if (!value) {
    return "Découvrez cette nouvelle opportunité sur PaxKonnect.";
  }

  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function isClosingSoon(deadline: string | null) {
  if (!deadline) {
    return false;
  }

  const deadlineTime = new Date(`${deadline}T00:00:00`).getTime();
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  return deadlineTime >= now && deadlineTime - now < fourteenDays;
}

function formatDeadline(deadline: string | null) {
  if (!deadline) {
    return "Échéance à confirmer";
  }

  return new Date(`${deadline}T00:00:00`).toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function chunkRecipients<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function getUserEmailMap(profileIds: string[]) {
  const adminSupabase = createAdminClient();
  const emailMap = new Map<string, string>();
  let page = 1;
  const perPage = 1000;

  while (emailMap.size < profileIds.length) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      console.error("Failed to list users for opportunity alerts:", error.message);
      return emailMap;
    }

    for (const user of data.users) {
      if (user.email && profileIds.includes(user.id)) {
        emailMap.set(user.id, user.email);
      }
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return emailMap;
}

export async function sendOpportunityAlerts(opportunity: Opportunity) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  const matchingDisciplines = categoryDisciplineMap[opportunity.category];
  const adminSupabase = createAdminClient();
  const { data: profiles, error } = await adminSupabase
    .from("profiles")
    .select("id,full_name,stage_name,artistic_disciplines,notifications_opt_out")
    .eq("role", "artist")
    .eq("notifications_opt_out", false)
    .overlaps("artistic_disciplines", matchingDisciplines);

  if (error) {
    return { ok: false, error: error.message, sent: 0 };
  }

  const candidates = (profiles ?? []) as ArtistAlertProfile[];
  const emailMap = await getUserEmailMap(candidates.map((profile) => profile.id));
  const recipients: ArtistRecipient[] = candidates
    .map((profile) => {
      const email = emailMap.get(profile.id);
      return email ? { ...profile, email } : null;
    })
    .filter((recipient): recipient is ArtistRecipient => Boolean(recipient));

  try {
    await sendPushToProfiles(
      recipients.map((recipient) => recipient.id),
      {
        body: opportunity.title,
        title: "🎯 Nouvelle opportunité pour vous",
        url: `/fr/opportunities/${opportunity.id}`,
      },
    );
  } catch (pushError) {
    console.error("[opportunity alert push]", pushError);
  }

  if (!apiKey || !from) {
    return { ok: true, sent: 0, skipped: true };
  }

  const resend = new Resend(apiKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const opportunityUrl = `${siteUrl}/fr/opportunities/${opportunity.id}`;
  const deadline = formatDeadline(opportunity.deadline);
  let sent = 0;

  for (const batch of chunkRecipients(recipients, 50)) {
    const results = await Promise.allSettled(
      batch.map((recipient) =>
        resend.emails.send({
          from,
          react: createElement(NewOpportunityEmail, {
            category: opportunity.category,
            deadline,
            description: truncate(opportunity.description, 200),
            footer: "Vous recevez cet email car votre profil correspond à cette opportunité.",
            isClosingSoon: isClosingSoon(opportunity.deadline),
            location: opportunity.location || "Belgique",
            logo: "PaxKonnect",
            opportunityUrl,
            organizer: opportunity.organizer || "MonsPax ASBL",
            title: opportunity.title,
            unsubscribeLabel: "Me désabonner",
            unsubscribeUrl: `${siteUrl}/fr/unsubscribe?token=${createUnsubscribeToken(recipient.id)}`,
          }),
          subject: `🎯 Nouvelle opportunité pour vous — ${opportunity.title}`,
          to: recipient.email,
        }),
      ),
    );

    sent += results.filter((result) => result.status === "fulfilled" && !result.value.error).length;
  }

  console.log(`Sent opportunity alert to ${sent} artists`);

  return { ok: true, sent };
}
