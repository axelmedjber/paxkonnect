import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PushSubscription } from "@/lib/types";

type PushPayload = {
  body: string;
  title: string;
  url: string;
};

let vapidConfigured = false;

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    return false;
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    vapidConfigured = true;
  }

  return true;
}

function toWebPushSubscription(subscription: PushSubscription) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      auth: subscription.auth,
      p256dh: subscription.p256dh,
    },
  };
}

export async function sendPushToProfile(profileId: string, payload: PushPayload) {
  if (!configureVapid()) {
    return { ok: true, sent: 0, skipped: true };
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("push_subscriptions")
    .select("*")
    .eq("profile_id", profileId);

  if (error) {
    console.error("[push] list subscriptions:", error.message);
    return { ok: false, sent: 0, error: error.message };
  }

  const subscriptions = (data ?? []) as PushSubscription[];
  let sent = 0;

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(subscription), JSON.stringify(payload));
        sent += 1;
      } catch (error) {
        console.error("[push] send failed:", error);
      }
    }),
  );

  return { ok: true, sent };
}

export async function sendPushToProfiles(profileIds: string[], payload: PushPayload) {
  const results = await Promise.allSettled(profileIds.map((profileId) => sendPushToProfile(profileId, payload)));
  const sent = results.reduce((total, result) => {
    if (result.status === "fulfilled" && "sent" in result.value) {
      return total + result.value.sent;
    }

    return total;
  }, 0);

  return { ok: true, sent };
}
