"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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

function logActionError(scope: string, error: string) {
  console.error(`[availability action] ${scope}: ${error}`);
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

export async function setArtistAvailability(formData: FormData) {
  const locale = getLocale(formData);
  const { adminSupabase, user } = await assertArtist(locale);
  const parsed = availabilitySchema.safeParse({
    date: getText(formData, "date"),
    note: getText(formData, "note"),
    status: getText(formData, "status"),
  });

  if (!parsed.success) {
    logActionError("setArtistAvailability", "Invalid availability payload");
    return;
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
    logActionError("setArtistAvailability", error.message);
    return;
  }

  revalidatePath(localizedPath(locale, "/availability"));
  revalidatePath(localizedPath(locale, `/artists/${user.id}`));
}

export async function clearArtistAvailability(formData: FormData) {
  const locale = getLocale(formData);
  const { adminSupabase, user } = await assertArtist(locale);
  const date = getText(formData, "date");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    logActionError("clearArtistAvailability", "Invalid availability date");
    return;
  }

  const { error } = await adminSupabase
    .from("artist_availability")
    .delete()
    .eq("profile_id", user.id)
    .eq("date", date);

  if (error) {
    logActionError("clearArtistAvailability", error.message);
    return;
  }

  revalidatePath(localizedPath(locale, "/availability"));
  revalidatePath(localizedPath(locale, `/artists/${user.id}`));
}
