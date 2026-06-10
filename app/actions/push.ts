"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

export async function savePushSubscription(subscription: unknown): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(subscription);

  if (!parsed.success) {
    return { success: false, error: "Invalid push subscription." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: userError?.message ?? "You must be signed in." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      auth: parsed.data.keys.auth,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      profile_id: user.id,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("[push subscription]", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
