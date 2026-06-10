import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MessageThread } from "@/components/MessageThread";
import { Card, CardContent } from "@/components/ui/card";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, DirectMessage } from "@/lib/types";

type MessageThreadPageProps = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function MessageThreadPage({ params }: MessageThreadPageProps) {
  const { id, locale } = await params;
  const t = await getTranslations("inbox");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const adminSupabase = createAdminClient();
  const { data: conversationData, error } = await adminSupabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const conversation = conversationData as Conversation | null;
  if (error) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {t("load_error", { message: error.message })}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!conversation) {
    notFound();
  }

  if (conversation.artist_id !== user.id && conversation.operator_id !== user.id) {
    redirect(localizedPath(locale, "/messages"));
  }

  const otherProfileId = conversation.artist_id === user.id ? conversation.operator_id : conversation.artist_id;
  const { data: profilesData } = await adminSupabase
    .from("profiles")
    .select("id,full_name,stage_name,avatar_url")
    .in("id", [conversation.artist_id, conversation.operator_id]);
  const { data: opportunity } = conversation.opportunity_id
    ? await adminSupabase
        .from("opportunities")
        .select("id,title")
        .eq("id", conversation.opportunity_id)
        .maybeSingle()
    : { data: null };
  const { data: messagesData } = await adminSupabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  await adminSupabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversation.id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  const messages = (messagesData ?? []) as DirectMessage[];

  return (
    <MessageThread
      backLabel={t("back_to_inbox")}
      conversationId={conversation.id}
      currentUserId={user.id}
      emptyLabel={t("empty_thread")}
      generalConversationLabel={t("general_conversation")}
      initialMessages={messages}
      locale={locale}
      opportunity={opportunity}
      otherProfileId={otherProfileId}
      profiles={profilesData ?? []}
      readLabel={t("read")}
      replyPlaceholder={t("reply_placeholder")}
      sendLabel={t("send")}
      unknownUserLabel={t("unknown_user")}
    />
  );
}
