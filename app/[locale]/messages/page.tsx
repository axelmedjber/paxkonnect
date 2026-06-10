import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Profile } from "@/lib/types";

type MessagesPageProps = {
  params: Promise<{ locale: string }>;
};

function initials(profile: Pick<Profile, "full_name" | "stage_name"> | undefined) {
  const value = profile?.stage_name || profile?.full_name || "?";
  return value.slice(0, 2).toUpperCase();
}

function displayName(profile: Pick<Profile, "full_name" | "stage_name"> | undefined, fallback: string) {
  return profile?.stage_name || profile?.full_name || fallback;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { locale } = await params;
  const t = await getTranslations("inbox");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("conversations")
    .select("*")
    .or(`artist_id.eq.${user.id},operator_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  const conversations = (data ?? []) as Conversation[];
  const profileIds = Array.from(
    new Set(conversations.flatMap((conversation) => [conversation.artist_id, conversation.operator_id])),
  );
  const opportunityIds = Array.from(
    new Set(conversations.map((conversation) => conversation.opportunity_id).filter((id): id is string => Boolean(id))),
  );
  const conversationIds = conversations.map((conversation) => conversation.id);

  const { data: profilesData } = profileIds.length
    ? await adminSupabase
        .from("profiles")
        .select("id,full_name,stage_name,avatar_url")
        .in("id", profileIds)
    : { data: [] };
  const { data: opportunitiesData } = opportunityIds.length
    ? await adminSupabase
        .from("opportunities")
        .select("id,title")
        .in("id", opportunityIds)
    : { data: [] };
  const { data: unreadData } = conversationIds.length
    ? await adminSupabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .is("read_at", null)
    : { data: [] };

  const profiles = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));
  const opportunities = new Map((opportunitiesData ?? []).map((opportunity) => [opportunity.id, opportunity]));
  const unreadCounts = new Map<string, number>();
  for (const message of unreadData ?? []) {
    unreadCounts.set(message.conversation_id, (unreadCounts.get(message.conversation_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section>
        <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("description")}</p>
      </section>

      {error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {t("load_error", { message: error.message })}
          </CardContent>
        </Card>
      ) : conversations.length > 0 ? (
        <section className="flex flex-col gap-3">
          {conversations.map((conversation) => {
            const otherProfileId =
              conversation.artist_id === user.id ? conversation.operator_id : conversation.artist_id;
            const otherProfile = profiles.get(otherProfileId);
            const opportunity = conversation.opportunity_id
              ? opportunities.get(conversation.opportunity_id)
              : undefined;
            const unread = unreadCounts.get(conversation.id) ?? 0;

            return (
              <Link key={conversation.id} href={localizedPath(locale, `/messages/${conversation.id}`)}>
                <Card className="border-purple-100 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800">
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="size-12">
                      <AvatarImage src={otherProfile?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{initials(otherProfile)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold">
                          {displayName(otherProfile, t("unknown_user"))}
                        </h2>
                        {unread > 0 ? <Badge>{t("unread_count", { count: unread })}</Badge> : null}
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {opportunity?.title || t("general_conversation")}
                      </p>
                    </div>
                    <p className="hidden text-xs text-muted-foreground sm:block">
                      {new Date(conversation.last_message_at).toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Button asChild className="w-fit">
              <Link href={localizedPath(locale, "/opportunities")}>{t("browse_opportunities")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
