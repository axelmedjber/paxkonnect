"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActionFeedback } from "@/lib/action-feedback";
import type { ActionFeedbackResult } from "@/lib/action-state";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getLocale(formData: FormData) {
  return getText(formData, "locale") || "fr";
}

function actionError(scope: string, error: string): ActionResult {
  console.error(`[messages action] ${scope}: ${error}`);
  return { success: false, error };
}

function actionSuccess<T = null>(data: T): ActionResult<T> {
  return { success: true, data };
}

async function getSignedInUser(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  return user;
}

export async function startConversation(formData: FormData): Promise<ActionFeedbackResult> {
  const locale = getLocale(formData);
  const user = await getSignedInUser(locale);
  const feedback = await getActionFeedback("messages action", locale);
  const opportunityId = getText(formData, "opportunity_id");
  const parsed = messageSchema.safeParse({ body: getText(formData, "body") });

  if (!opportunityId || !parsed.success) {
    return feedback.error("startConversation", "Invalid message payload");
  }

  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return feedback.error("startConversation", profileError.message);
  }

  if (profile?.role !== "artist") {
    return feedback.error("startConversation", "Only artists can contact operators");
  }

  const { data: opportunity, error: opportunityError } = await adminSupabase
    .from("opportunities")
    .select("id,operator_id")
    .eq("id", opportunityId)
    .eq("is_active", true)
    .maybeSingle();

  if (opportunityError) {
    return feedback.error("startConversation", opportunityError.message);
  }

  if (!opportunity?.operator_id || opportunity.operator_id === user.id) {
    return feedback.error("startConversation", "This opportunity cannot be contacted");
  }

  const now = new Date().toISOString();
  const { data: conversation, error: conversationError } = await adminSupabase
    .from("conversations")
    .upsert(
      {
        artist_id: user.id,
        operator_id: opportunity.operator_id,
        opportunity_id: opportunity.id,
        last_message_at: now,
      },
      { onConflict: "artist_id,operator_id,opportunity_id" },
    )
    .select("id")
    .single();

  if (conversationError || !conversation) {
    return feedback.error("startConversation", conversationError?.message ?? "Conversation was not created");
  }

  const { error: messageError } = await adminSupabase.from("messages").insert({
    body: parsed.data.body,
    conversation_id: conversation.id,
    sender_id: user.id,
  });

  if (messageError) {
    return feedback.error("startConversation", messageError.message);
  }

  const { error: timestampError } = await adminSupabase
    .from("conversations")
    .update({ last_message_at: now })
    .eq("id", conversation.id);

  if (timestampError) {
    console.error(`[messages action] startConversation timestamp: ${timestampError.message}`);
  }

  revalidatePath(localizedPath(locale, "/messages"));
  redirect(localizedPath(locale, `/messages/${conversation.id}`));
}

export async function sendMessage(formData: FormData) {
  const locale = getLocale(formData);
  const user = await getSignedInUser(locale);
  const conversationId = getText(formData, "conversation_id");
  const parsed = messageSchema.safeParse({ body: getText(formData, "body") });

  if (!conversationId || !parsed.success) {
    return;
  }

  const adminSupabase = createAdminClient();
  const { data: conversation, error: conversationError } = await adminSupabase
    .from("conversations")
    .select("id,artist_id,operator_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) {
    return actionError("sendMessage", conversationError.message);
  }

  if (!conversation || (conversation.artist_id !== user.id && conversation.operator_id !== user.id)) {
    redirect(localizedPath(locale, "/messages"));
  }

  const now = new Date().toISOString();
  const { error: messageError } = await adminSupabase.from("messages").insert({
    body: parsed.data.body,
    conversation_id: conversationId,
    sender_id: user.id,
  });

  if (messageError) {
    return actionError("sendMessage", messageError.message);
  }

  const { error: timestampError } = await adminSupabase
    .from("conversations")
    .update({ last_message_at: now })
    .eq("id", conversationId);

  if (timestampError) {
    return actionError("sendMessage", timestampError.message);
  }

  revalidatePath(localizedPath(locale, "/messages"));
  revalidatePath(localizedPath(locale, `/messages/${conversationId}`));
  return actionSuccess(null);
}

export async function sendRealtimeMessage({
  body,
  conversationId,
  locale,
}: {
  body: string;
  conversationId: string;
  locale: string;
}) {
  const user = await getSignedInUser(locale);
  const parsed = messageSchema.safeParse({ body });

  if (!conversationId || !parsed.success) {
    return actionError("sendRealtimeMessage", "Invalid message.");
  }

  const adminSupabase = createAdminClient();
  const { data: conversation, error: conversationError } = await adminSupabase
    .from("conversations")
    .select("id,artist_id,operator_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) {
    return actionError("sendRealtimeMessage", conversationError.message);
  }

  if (!conversation || (conversation.artist_id !== user.id && conversation.operator_id !== user.id)) {
    return actionError("sendRealtimeMessage", "Conversation not found.");
  }

  const now = new Date().toISOString();
  const { data: message, error } = await adminSupabase
    .from("messages")
    .insert({
      body: parsed.data.body,
      conversation_id: conversationId,
      sender_id: user.id,
    })
    .select("*")
    .single();

  if (error || !message) {
    return actionError("sendRealtimeMessage", error?.message ?? "Message could not be sent.");
  }

  const { error: timestampError } = await adminSupabase
    .from("conversations")
    .update({ last_message_at: now })
    .eq("id", conversationId);

  if (timestampError) {
    return actionError("sendRealtimeMessage", timestampError.message);
  }

  revalidatePath(localizedPath(locale, "/messages"));
  revalidatePath(localizedPath(locale, `/messages/${conversationId}`));

  return actionSuccess(message);
}
