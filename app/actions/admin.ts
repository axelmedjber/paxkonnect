"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getActionFeedback } from "@/lib/action-feedback";
import type { ActionFeedbackResult } from "@/lib/action-state";
import { getAdminAccess } from "@/lib/admin-access";
import { sendOpportunityAlerts } from "@/lib/emails/sendOpportunityAlerts";
import { sendStatusNotification } from "@/lib/emails/sendStatusNotification";
import { localizedPath } from "@/lib/routes";
import type { MatchingStatus, OpportunityCategory, PartnerType, PlaceType, ProfileRole } from "@/lib/types";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const opportunityCategories: OpportunityCategory[] = [
  "radio",
  "podcast",
  "event",
  "contest",
  "residency",
  "other",
];
const partnerTypes: PartnerType[] = ["radio", "podcast", "venue", "festival", "institution", "other"];
const matchingStatuses: MatchingStatus[] = ["pending", "applied", "accepted", "rejected"];
const placeTypes: PlaceType[] = [
  "radio",
  "cultural_center",
  "concert_bar",
  "venue",
  "gallery",
  "festival",
  "studio",
  "other",
];
const profileRoles: ProfileRole[] = ["artist", "operator", "admin"];

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableText(formData: FormData, key: string) {
  const value = getText(formData, key);
  return value || null;
}

function getLocale(formData: FormData) {
  return getText(formData, "locale") || "fr";
}

function isOpportunityCategory(value: string): value is OpportunityCategory {
  return opportunityCategories.some((category) => category === value);
}

function isPartnerType(value: string): value is PartnerType {
  return partnerTypes.some((type) => type === value);
}

function isMatchingStatus(value: string): value is MatchingStatus {
  return matchingStatuses.some((status) => status === value);
}

function isPlaceType(value: string): value is PlaceType {
  return placeTypes.some((type) => type === value);
}

function isProfileRole(value: string): value is ProfileRole {
  return profileRoles.some((role) => role === value);
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getText(formData, key));
  return Number.isFinite(value) ? value : null;
}

function actionError(scope: string, error: string): ActionResult {
  console.error(`[admin action] ${scope}: ${error}`);
  return { success: false, error };
}

function actionSuccess<T = null>(data: T): ActionResult<T> {
  return { success: true, data };
}

async function assertAdminAccess(locale: string) {
  const access = await getAdminAccess();

  if (!access.ok) {
    redirect(localizedPath(locale, access.reason === "not_signed_in" ? "/auth" : "/dashboard"));
  }

  return access;
}

function revalidateAdmin(locale: string) {
  revalidatePath(localizedPath(locale, "/admin"));
}

export async function toggleProfileMember(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const id = getText(formData, "id");
  const isMember = getText(formData, "is_member") === "true";

  if (!id) {
    return feedback.error("toggleProfileMember", "Missing profile id");
  }

  const { error } = await adminSupabase.from("profiles").update({ is_member: isMember }).eq("id", id);

  if (error) {
    return feedback.error("toggleProfileMember", error.message);
  }

  revalidateAdmin(locale);
  return feedback.saved();
}

export async function toggleProfileFeatured(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const id = getText(formData, "id");
  const isFeatured = getText(formData, "is_featured") === "true";

  if (!id) {
    return feedback.error("toggleProfileFeatured", "Missing profile id");
  }

  if (isFeatured) {
    const { count, error } = await adminSupabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_featured", true);

    if (error) {
      return feedback.error("toggleProfileFeatured", error.message);
    }

    if ((count ?? 0) >= 5) {
      revalidateAdmin(locale);
      return feedback.error("toggleProfileFeatured", "Featured artist limit reached");
    }
  }

  const now = new Date();
  const featuredMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { error } = await adminSupabase
    .from("profiles")
    .update({
      featured_month: isFeatured ? featuredMonth : null,
      is_featured: isFeatured,
    })
    .eq("id", id);

  if (error) {
    return feedback.error("toggleProfileFeatured", error.message);
  }

  revalidateAdmin(locale);
  return feedback.saved();
}

export async function updateProfileRole(id: string, role: ProfileRole, locale: string) {
  const { adminSupabase, user } = await assertAdminAccess(locale);

  if (!id || !isProfileRole(role)) {
    return actionError("updateProfileRole", "Invalid profile role payload");
  }

  if (id === user.id) {
    return actionError("updateProfileRole", "Admins cannot change their own role");
  }

  const { error } = await adminSupabase.from("profiles").update({ role }).eq("id", id);
  revalidateAdmin(locale);

  if (error) {
    return actionError("updateProfileRole", error.message);
  }

  return actionSuccess(null);
}

export async function createOpportunity(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const category = getText(formData, "category");

  if (!isOpportunityCategory(category)) {
    return feedback.error("createOpportunity", "Invalid opportunity category");
  }

  const { data: opportunity, error } = await adminSupabase.from("opportunities").insert({
    title: getText(formData, "title"),
    category,
    description: getNullableText(formData, "description"),
    location: getNullableText(formData, "location"),
    organizer: getNullableText(formData, "organizer"),
    contact_email: getNullableText(formData, "contact_email"),
    external_url: getNullableText(formData, "external_url"),
    deadline: getNullableText(formData, "deadline"),
    is_active: true,
  }).select("*").single();

  if (error || !opportunity) {
    return feedback.error("createOpportunity", error?.message ?? "Opportunity was not created");
  }

  await sendOpportunityAlerts(opportunity);

  revalidateAdmin(locale);
  return feedback.created();
}

export async function updateOpportunity(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const id = getText(formData, "id");
  const category = getText(formData, "category");

  if (!id || !isOpportunityCategory(category)) {
    return feedback.error("updateOpportunity", "Invalid opportunity payload");
  }

  const { error } = await adminSupabase
    .from("opportunities")
    .update({
      title: getText(formData, "title"),
      category,
      description: getNullableText(formData, "description"),
      location: getNullableText(formData, "location"),
      organizer: getNullableText(formData, "organizer"),
      contact_email: getNullableText(formData, "contact_email"),
      external_url: getNullableText(formData, "external_url"),
      deadline: getNullableText(formData, "deadline"),
    })
    .eq("id", id);

  if (error) {
    return feedback.error("updateOpportunity", error.message);
  }

  revalidateAdmin(locale);
  return feedback.saved();
}

export async function deleteOpportunity(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const id = getText(formData, "id");

  if (!id) {
    return feedback.error("deleteOpportunity", "Missing opportunity id");
  }

  const { error } = await adminSupabase.from("opportunities").delete().eq("id", id);

  if (error) {
    return feedback.error("deleteOpportunity", error.message);
  }

  revalidateAdmin(locale);
  return feedback.deleted();
}

export async function toggleOpportunityActive(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const id = getText(formData, "id");
  const isActive = getText(formData, "is_active") === "true";

  if (!id) {
    return feedback.error("toggleOpportunityActive", "Missing opportunity id");
  }

  const { error } = await adminSupabase.from("opportunities").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return feedback.error("toggleOpportunityActive", error.message);
  }

  revalidateAdmin(locale);
  return feedback.saved();
}

export async function createPartner(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const type = getText(formData, "type");

  if (!isPartnerType(type)) {
    return feedback.error("createPartner", "Invalid partner type");
  }

  const { error } = await adminSupabase.from("partners").insert({
    name: getText(formData, "name"),
    type,
    website: getNullableText(formData, "website"),
    contact_email: getNullableText(formData, "contact_email"),
    description: getNullableText(formData, "description"),
    logo_url: getNullableText(formData, "logo_url"),
    is_active: true,
  });

  if (error) {
    return feedback.error("createPartner", error.message);
  }

  revalidateAdmin(locale);
  return feedback.created();
}

export async function togglePartnerActive(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const id = getText(formData, "id");
  const isActive = getText(formData, "is_active") === "true";

  if (!id) {
    return feedback.error("togglePartnerActive", "Missing partner id");
  }

  const { error } = await adminSupabase.from("partners").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return feedback.error("togglePartnerActive", error.message);
  }

  revalidateAdmin(locale);
  return feedback.saved();
}

export async function createPlace(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const type = getText(formData, "type");
  const latitude = getNumber(formData, "latitude");
  const longitude = getNumber(formData, "longitude");

  if (!isPlaceType(type) || latitude === null || longitude === null) {
    return feedback.error("createPlace", "Invalid place payload");
  }

  const { error } = await adminSupabase.from("places").insert({
    name: getText(formData, "name"),
    type,
    address: getNullableText(formData, "address"),
    city: getNullableText(formData, "city"),
    latitude,
    longitude,
    website: getNullableText(formData, "website"),
    description: getNullableText(formData, "description"),
    is_active: true,
  });

  if (error) {
    return feedback.error("createPlace", error.message);
  }

  revalidateAdmin(locale);
  return feedback.created();
}

export async function togglePlaceActive(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase } = await assertAdminAccess(locale);
  const feedback = await getActionFeedback("admin action", locale);
  const id = getText(formData, "id");
  const isActive = getText(formData, "is_active") === "true";

  if (!id) {
    return feedback.error("togglePlaceActive", "Missing place id");
  }

  const { error } = await adminSupabase.from("places").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return feedback.error("togglePlaceActive", error.message);
  }

  revalidateAdmin(locale);
  return feedback.saved();
}

export async function updateMatchingStatus(id: string, status: MatchingStatus, locale: string) {
  const { adminSupabase } = await assertAdminAccess(locale);

  if (!id || !isMatchingStatus(status)) {
    return actionError("updateMatchingStatus", "Invalid matching status payload");
  }

  const { data: matching, error: matchingError } = await adminSupabase
    .from("matchings")
    .select("id,profile_id,status,profile:profiles(full_name,stage_name),opportunity:opportunities(title,organizer)")
    .eq("id", id)
    .maybeSingle();

  if (matchingError) {
    return actionError("updateMatchingStatus", matchingError.message);
  }

  const { error } = await adminSupabase.from("matchings").update({ status }).eq("id", id);
  revalidateAdmin(locale);

  if (error) {
    return actionError("updateMatchingStatus", error.message);
  }

  if (matching && matching.status !== status && (status === "accepted" || status === "rejected")) {
    const { data: userResponse } = await adminSupabase.auth.admin.getUserById(matching.profile_id);
    const email = userResponse.user?.email;
    const profile = Array.isArray(matching.profile)
      ? matching.profile[0]
      : matching.profile;
    const opportunity = Array.isArray(matching.opportunity)
      ? matching.opportunity[0]
      : matching.opportunity;
    const opportunityTitle = opportunity?.title;
    const organizer = opportunity?.organizer || "MonsPax ASBL";
    const artistName = profile?.stage_name || profile?.full_name || email || "Artiste";

    if (email && opportunityTitle) {
      const emailResult = await sendStatusNotification({
        artistName,
        locale,
        opportunityTitle,
        organizer,
        profileId: matching.profile_id,
        status,
        to: email,
      });

      if (!emailResult.ok) {
        console.error(`[admin action] updateMatchingStatus email: ${emailResult.error}`);
        return actionSuccess({ emailError: emailResult.error });
      }
    }
  }

  return actionSuccess(null);
}
