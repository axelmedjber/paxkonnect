"use server";

import { redirect } from "next/navigation";

import { getActionFeedback } from "@/lib/action-feedback";
import type { ActionFeedbackResult } from "@/lib/action-state";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const userStorageBuckets = ["avatars", "press-photos", "tech-riders"] as const;

function getLocale(formData: FormData) {
  const value = formData.get("locale");
  return typeof value === "string" && value ? value : "fr";
}

export async function deleteOwnAccount(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const feedback = await getActionFeedback("account action", locale);
  const adminSupabase = createAdminClient();

  // Best-effort cleanup of uploaded files; rows are removed by the
  // auth.users -> profiles -> child tables ON DELETE CASCADE chain.
  for (const bucket of userStorageBuckets) {
    const { data: files, error: listError } = await adminSupabase.storage.from(bucket).list(user.id);

    if (listError) {
      console.error(`[account action] deleteOwnAccount storage list ${bucket}: ${listError.message}`);
      continue;
    }

    if (files && files.length > 0) {
      const { error: removeError } = await adminSupabase.storage
        .from(bucket)
        .remove(files.map((file) => `${user.id}/${file.name}`));

      if (removeError) {
        console.error(`[account action] deleteOwnAccount storage remove ${bucket}: ${removeError.message}`);
      }
    }
  }

  const { error } = await adminSupabase.auth.admin.deleteUser(user.id);

  if (error) {
    return feedback.error("deleteOwnAccount", error.message);
  }

  await supabase.auth.signOut();
  redirect(localizedPath(locale));
}
