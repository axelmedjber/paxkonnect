"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActionFeedback } from "@/lib/action-feedback";
import type { ActionFeedbackResult } from "@/lib/action-state";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AvailabilityStatus } from "@/lib/types";

const statuses: AvailabilityStatus[] = ["available", "unavailable", "tentative"];

const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(240).optional(),
  status: z.enum(statuses),
});

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getLocale(formData: FormData) {
  return getText(formData, "locale") || "fr";
}

async function assertArtist(locale: string) {
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

  if (profile?.role !== "artist" && profile?.role !== "admin") {
    redirect(localizedPath(locale, "/dashboard"));
  }

  return {
    adminSupabase: createAdminClient(),
    user,
  };
}

export async function setArtistAvailability(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase, user } = await assertArtist(locale);
  const feedback = await getActionFeedback("availability action", locale);
  const parsed = availabilitySchema.safeParse({
    date: getText(formData, "date"),
    note: getText(formData, "note"),
    status: getText(formData, "status"),
  });

  if (!parsed.success) {
    return feedback.error("setArtistAvailability", "Invalid availability payload");
  }

  const { error } = await adminSupabase.from("artist_availability").upsert(
    {
      date: parsed.data.date,
      note: parsed.data.note || null,
      profile_id: user.id,
      status: parsed.data.status,
    },
    { onConflict: "profile_id,date" },
  );

  if (error) {
    return feedback.error("setArtistAvailability", error.message);
  }

  revalidatePath(localizedPath(locale, "/availability"));
  revalidatePath(localizedPath(locale, `/artists/${user.id}`));
  return feedback.saved();
}

export async function clearArtistAvailability(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const { adminSupabase, user } = await assertArtist(locale);
  const feedback = await getActionFeedback("availability action", locale);
  const date = getText(formData, "date");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return feedback.error("clearArtistAvailability", "Invalid availability date");
  }

  const { error } = await adminSupabase
    .from("artist_availability")
    .delete()
    .eq("profile_id", user.id)
    .eq("date", date);

  if (error) {
    return feedback.error("clearArtistAvailability", error.message);
  }

  revalidatePath(localizedPath(locale, "/availability"));
  revalidatePath(localizedPath(locale, `/artists/${user.id}`));
  return feedback.deleted();
}
