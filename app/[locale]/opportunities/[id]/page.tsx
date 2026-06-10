import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { startConversation } from "@/app/actions/messages";
import { ActionFeedbackForm } from "@/components/ActionFeedbackForm";
import { ApplyOpportunityButton } from "@/components/ApplyOpportunityButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { localizedPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

type OpportunityDetailPageProps = {
  params: Promise<{ id: string; locale: string }>;
};

function truncateDescription(value: string | null | undefined) {
  if (!value) {
    return "Cultural opportunity on PaxKonnect";
  }

  return value.length > 160 ? `${value.slice(0, 157)}...` : value;
}

export async function generateMetadata({ params }: OpportunityDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!opportunity) {
    return {};
  }

  const title = `${opportunity.title} — PaxKonnect`;
  const description = truncateDescription(opportunity.description);
  const image = "/og-default.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const t = await getTranslations("opportunity_detail");
  const common = await getTranslations("common");
  const { id, locale } = await params;
  const supabase = await createClient();
  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!opportunity) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existingMatching } = user
    ? await supabase
        .from("matchings")
        .select("id")
        .eq("profile_id", user.id)
        .eq("opportunity_id", id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Card>
        <CardHeader className="gap-4">
          <Badge variant="secondary">{opportunity.category}</Badge>
          <CardTitle className="text-4xl leading-tight">{opportunity.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="leading-7 text-muted-foreground">
            {opportunity.description || t("description_empty")}
          </p>
          <dl className="grid gap-4 rounded-lg bg-muted p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium">{t("organizer")}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {opportunity.organizer || common("not_specified")}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium">{t("deadline")}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {formatDate(opportunity.deadline, common("no_deadline"), locale)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium">{t("contact")}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {opportunity.contact_email || common("not_specified")}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium">{t("location")}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {opportunity.location || common("belgium")}
              </dd>
            </div>
          </dl>
          <ApplyOpportunityButton
            alreadyApplied={Boolean(existingMatching)}
            opportunityId={id}
            userId={user?.id ?? null}
          />
          {opportunity.operator_id && opportunity.operator_id !== user?.id ? (
            <Card className="border-purple-100 bg-background dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-xl">{t("message_operator_title")}</CardTitle>
              </CardHeader>
              <CardContent>
                {user ? (
                  <ActionFeedbackForm action={startConversation} className="flex flex-col gap-3">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="opportunity_id" value={id} />
                    <Textarea
                      name="body"
                      required
                      maxLength={2000}
                      rows={4}
                      placeholder={t("message_operator_placeholder")}
                    />
                    <Button type="submit" className="self-start">
                      {t("message_operator_send")}
                    </Button>
                  </ActionFeedbackForm>
                ) : (
                  <Button asChild>
                    <Link href={localizedPath(locale, "/auth")}>{t("message_operator_sign_in")}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
