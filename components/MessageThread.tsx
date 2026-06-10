"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { sendRealtimeMessage } from "@/app/actions/messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { localizedPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import type { DirectMessage, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type ThreadProfile = Pick<Profile, "avatar_url" | "full_name" | "id" | "stage_name">;
type ThreadOpportunity = {
  id: string;
  title: string;
} | null;
type OptimisticMessage = DirectMessage & {
  isOptimistic?: boolean;
};

type MessageThreadProps = {
  backLabel: string;
  conversationId: string;
  currentUserId: string;
  emptyLabel: string;
  generalConversationLabel: string;
  initialMessages: DirectMessage[];
  locale: string;
  opportunity: ThreadOpportunity;
  otherProfileId: string;
  profiles: ThreadProfile[];
  readLabel: string;
  replyPlaceholder: string;
  sendLabel: string;
  unknownUserLabel: string;
};

function initials(profile: Pick<Profile, "full_name" | "stage_name"> | undefined) {
  const value = profile?.stage_name || profile?.full_name || "?";
  return value.slice(0, 2).toUpperCase();
}

function displayName(profile: Pick<Profile, "full_name" | "stage_name"> | undefined, fallback: string) {
  return profile?.stage_name || profile?.full_name || fallback;
}

export function MessageThread({
  backLabel,
  conversationId,
  currentUserId,
  emptyLabel,
  generalConversationLabel,
  initialMessages,
  locale,
  opportunity,
  otherProfileId,
  profiles,
  readLabel,
  replyPlaceholder,
  sendLabel,
  unknownUserLabel,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<OptimisticMessage[]>(initialMessages);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const otherProfile = profileMap.get(otherProfileId);

  function scrollToBottom() {
    window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  useEffect(() => {
    scrollToBottom();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `conversation_id=eq.${conversationId}`,
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const nextMessage = payload.new as DirectMessage;
          setMessages((current) => {
            if (current.some((message) => message.id === nextMessage.id)) {
              return current;
            }

            const optimisticIndex = current.findIndex(
              (message) =>
                message.isOptimistic &&
                message.sender_id === nextMessage.sender_id &&
                message.body === nextMessage.body,
            );

            if (optimisticIndex >= 0) {
              const next = [...current];
              next[optimisticIndex] = nextMessage;
              return next;
            }

            return [...current, nextMessage];
          });
          scrollToBottom();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (!trimmedContent || isPending) {
      return;
    }

    setError(null);
    setContent("");

    const optimisticMessage: OptimisticMessage = {
      body: trimmedContent,
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
      id: crypto.randomUUID(),
      isOptimistic: true,
      read_at: null,
      sender_id: currentUserId,
    };

    setMessages((current) => [...current, optimisticMessage]);
    scrollToBottom();

    startTransition(async () => {
      const result = await sendRealtimeMessage({
        body: trimmedContent,
        conversationId,
        locale,
      });

      if (!result.success) {
        setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
        setError(result.error);
        return;
      }

      if (result.data) {
        setMessages((current) =>
          current.map((message) => (message.id === optimisticMessage.id ? result.data : message)),
        );
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="w-fit">
        <Link href={localizedPath(locale, "/messages")}>{backLabel}</Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="size-12">
            <AvatarImage src={otherProfile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{initials(otherProfile)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{displayName(otherProfile, unknownUserLabel)}</CardTitle>
            {opportunity ? (
              <Link
                href={localizedPath(locale, `/opportunities/${opportunity.id}`)}
                className="mt-1 inline-flex text-sm text-primary hover:underline"
              >
                {opportunity.title}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{generalConversationLabel}</p>
            )}
          </div>
        </CardHeader>
      </Card>

      <section className="flex flex-col gap-3">
        {messages.length > 0 ? (
          messages.map((message) => {
            const isMine = message.sender_id === currentUserId;
            const sender = profileMap.get(message.sender_id);

            return (
              <div key={message.id} className={cn("flex gap-3", isMine ? "justify-end" : "justify-start")}>
                {!isMine ? (
                  <Avatar className="mt-1 size-8">
                    <AvatarImage src={sender?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{initials(sender)}</AvatarFallback>
                  </Avatar>
                ) : null}
                <div
                  className={cn(
                    "max-w-[82%] rounded-lg border p-3 text-sm shadow-sm sm:max-w-[70%]",
                    isMine
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-purple-100 bg-card dark:border-zinc-800",
                    message.isOptimistic && "opacity-70",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] opacity-75">
                    <span>
                      {new Date(message.created_at).toLocaleString(locale, {
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                      })}
                    </span>
                    {isMine && message.read_at ? <Badge variant="secondary">{readLabel}</Badge> : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">{emptyLabel}</CardContent>
          </Card>
        )}
        <div ref={bottomRef} />
      </section>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              maxLength={2000}
              rows={4}
              placeholder={replyPlaceholder}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={isPending || !content.trim()} className="self-end">
              {sendLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
