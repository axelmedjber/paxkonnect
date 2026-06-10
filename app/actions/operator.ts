"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActionFeedback } from "@/lib/action-feedback";
import type { ActionFeedbackResult } from "@/lib/action-state";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const opportunitySchema = z.object({
  category: z.enum(["radio", "podcast", "event", "contest", "residency", "other"]),
  contact_email: z.string().trim().email().or(z.literal("")).transform((value) => value || null),
  deadline: z.string().trim().or(z.literal("")).transform((value) => value || null),
  description: z.string().trim().or(z.literal("")).transform((value) => value || null),
  external_url: z.string().trim().url().or(z.literal("")).transform((value) => value || null),
  location: z.string().trim().or(z.literal("")).transform((value) => value || null),
  organizer: z.string().trim().or(z.literal("")).transform((value) => value || null),
  title: z.string().trim().min(1),
});
const reviewSchema = z.object({
  comment: z.string().trim().max(500).optional(),
  opportunity_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
});

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getLocale(formData: FormData) {
  return getText(formData, "locale") || "fr";
}

async function assertOperatorAccess(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect(localizedPath(locale, "/dashboard"));
  }

  if (profile?.role !== "operator") {
    redirect(localizedPath(locale, "/dashboard"));
  }

  return {
    adminSupabase: createAdminClient(),
    user,
  };
}

function revalidateOperatorDashboard(locale: string) {
  revalidatePath(localizedPath(locale, "/operator/dashboard"));
  revalidatePath(localizedPath(locale, "/opportunities"));
}

export async function createOperatorOpportunity(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase, user } = await assertOperatorAccess(locale);
  const feedback = await getActionFeedback("operator action", locale);
  const parsed = opportunitySchema.safeParse({
    category: getText(formData, "category"),
    contact_email: getText(formData, "contact_email"),
    deadline: getText(formData, "deadline"),
    description: getText(formData, "description"),
    external_url: getText(formData, "external_url"),
    location: getText(formData, "location"),
    organizer: getText(formData, "organizer"),
    title: getText(formData, "title"),
  });

  if (!parsed.success) {
    return feedback.error("createOperatorOpportunity", "Invalid opportunity payload");
  }

  const { error } = await adminSupabase.from("opportunities").insert({
    ...parsed.data,
    is_active: true,
    operator_id: user.id,
  });

  if (error) {
    return feedback.error("createOperatorOpportunity", error.message);
  }

  revalidateOperatorDashboard(locale);
  return feedback.created();
}

export async function updateOperatorOpportunity(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase, user } = await assertOperatorAccess(locale);
  const feedback = await getActionFeedback("operator action", locale);
  const id = getText(formData, "id");
  const parsed = opportunitySchema.safeParse({
    category: getText(formData, "category"),
    contact_email: getText(formData, "contact_email"),
    deadline: getText(formData, "deadline"),
    description: getText(formData, "description"),
    external_url: getText(formData, "external_url"),
    location: getText(formData, "location"),
    organizer: getText(formData, "organizer"),
    title: getText(formData, "title"),
  });

  if (!id || !parsed.success) {
    return feedback.error("updateOperatorOpportunity", "Invalid opportunity payload");
  }

  const { error } = await adminSupabase
    .from("opportunities")
    .update(parsed.data)
    .eq("id", id)
    .eq("operator_id", user.id);

  if (error) {
    return feedback.error("updateOperatorOpportunity", error.message);
  }

  revalidateOperatorDashboard(locale);
  return feedback.saved();
}

export async function toggleOperatorOpportunityActive(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase, user } = await assertOperatorAccess(locale);
  const feedback = await getActionFeedback("operator action", locale);
  const id = getText(formData, "id");
  const isActive = getText(formData, "is_active") === "true";

  if (!id) {
    return feedback.error("toggleOperatorOpportunityActive", "Missing opportunity id");
  }

  const { error } = await adminSupabase
    .from("opportunities")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("operator_id", user.id);

  if (error) {
    return feedback.error("toggleOperatorOpportunityActive", error.message);
  }

  revalidateOperatorDashboard(locale);
  return feedback.saved();
}

export async function createArtistReview(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase, user } = await assertOperatorAccess(locale);
  const feedback = await getActionFeedback("operator action", locale);
  const parsed = reviewSchema.safeParse({
    comment: getText(formData, "comment"),
    opportunity_id: getText(formData, "opportunity_id"),
    profile_id: getText(formData, "profile_id"),
    rating: getText(formData, "rating"),
  });

  if (!parsed.success) {
    return feedback.error("createArtistReview", "Invalid review payload");
  }

  const { data: matching, error: matchingError } = await adminSupabase
    .from("matchings")
    .select("id,opportunity:opportunities(operator_id)")
    .eq("profile_id", parsed.data.profile_id)
    .eq("opportunity_id", parsed.data.opportunity_id)
    .eq("status", "accepted")
    .maybeSingle();

  if (matchingError) {
    return feedback.error("createArtistReview", matchingError.message);
  }
  const opportunity = Array.isArray(matching?.opportunity)
    ? matching?.opportunity[0]
    : matching?.opportunity;

  if (opportunity?.operator_id !== user.id) {
    return feedback.error("createArtistReview", "Review is not allowed for this opportunity");
  }

  const { error } = await adminSupabase.from("artist_reviews").insert({
    comment: parsed.data.comment || null,
    is_public: true,
    opportunity_id: parsed.data.opportunity_id,
    profile_id: parsed.data.profile_id,
    rating: parsed.data.rating,
    reviewer_id: user.id,
  });

  if (error) {
    return feedback.error("createArtistReview", error.message);
  }

  revalidateOperatorDashboard(locale);
  revalidatePath(localizedPath(locale, `/artists/${parsed.data.profile_id}`));
  return feedback.created();
}
