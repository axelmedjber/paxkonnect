import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EPKShareButton } from "@/components/EPKShareButton";
import { NotificationPermission } from "@/components/NotificationPermission";
import { OpportunityCard } from "@/components/OpportunityCard";
import { SignOutButton } from "@/components/SignOutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfileCompletion, type ProfileCompletionKey } from "@/lib/profile-completion";
import { localizedPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { Matching, Opportunity } from "@/lib/types";
import { cn, formatDate, generateSlug, getInitials } from "@/lib/utils";

type ApplicationWithOpportunity = Matching & {
  opportunity: Pick<Opportunity, "id" | "title"> | null;
};

const statusStyles: Record<Matching["status"], string> = {
  pending: "bg-secondary text-secondary-foreground",
  applied: "bg-primary text-primary-foreground",
  accepted: "bg-accent text-accent-foreground",
  rejected: "bg-muted text-muted-foreground",
};

const missingFieldLabelKeys: Record<ProfileCompletionKey, string> = {
  stage_name: "missing_stage_name",
  bio: "missing_bio",
  city: "missing_city",
  disciplines: "missing_disciplines",
  avatar: "missing_avatar",
  social: "missing_social",
};

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const common = await getTranslations("common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const [profileResponse, applicationsResponse, recommendedResponse] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("matchings")
      .select("*, opportunity:opportunities(id,title)")
      .eq("profile_id", user.id)
      .order("applied_at", { ascending: false }),
    supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true)
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(3),
  ]);

  const profile = profileResponse.data;
  const applications = (applicationsResponse.data ?? []) as ApplicationWithOpportunity[];
  const recommendedOpportunities = recommendedResponse.data ?? [];
  const displayName = profile?.stage_name || profile?.full_name || user.email || t("artist_fallback");
  const completion = getProfileCompletion(profile);
  const epkSlug = profile?.slug || `${generateSlug(profile?.stage_name || profile?.full_name, "artiste")}-${user.id.slice(0, 8)}`;
  const epkPath = `/epk/${epkSlug}`;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-4xl font-semibold tracking-normal">{t("welcome", { name: displayName })}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("welcome_back")}</p>
        </div>
        <SignOutButton />
      </div>

      <NotificationPermission />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile_completion")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex gap-4">
              <Avatar className="size-20">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={displayName} />
                ) : null}
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">
                  {profile?.stage_name || profile?.full_name || t("artist_profile")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.city || t("city_missing")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile?.artistic_disciplines ?? []).length > 0 ? (
                    profile?.artistic_disciplines?.map((discipline) => (
                      <Badge key={discipline} variant="secondary">
                        {discipline}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">{t("no_disciplines")}</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button asChild>
              <Link href={localizedPath(locale, "/profile/edit")}>{t("edit_profile")}</Link>
            </Button>
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {t("completion_percent", { percent: completion.percent })}
                </p>
                <span className="text-sm font-semibold text-primary">{completion.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>
              {completion.missingFields.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {completion.missingFields.map((field) => (
                    <Link
                      key={field}
                      href={localizedPath(locale, "/profile/edit")}
                      className="rounded-md border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      {t(missingFieldLabelKeys[field])}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("applications")}</CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length > 0 ? (
              <div className="flex flex-col gap-3">
                {applications.map((application) => (
                  <div
                    key={application.id}
                    className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {application.opportunity?.title || t("opportunity_removed")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("applied_date", { date: formatDate(application.applied_at, common("no_deadline"), locale) })}
                      </p>
                    </div>
                    <Badge className={cn("border-transparent", statusStyles[application.status])}>
                      {t(`status_${application.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-background p-5 text-sm text-muted-foreground">
                {t("no_applications")}{" "}
                <Link href={localizedPath(locale, "/opportunities")} className="font-medium text-primary hover:underline">
                  {t("browse_opportunities")}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-purple-200">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-normal">{t("epk_title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("epk_description")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <a href={epkPath} target="_blank" rel="noreferrer">
                {t("epk_view")}
              </a>
            </Button>
            <EPKShareButton url={epkPath} label={t("epk_copy")} successLabel={t("epk_share_success")} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-normal">{t("availability_title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("availability_description")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={localizedPath(locale, "/availability")}>{t("availability_manage")}</Link>
          </Button>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">
              {t("recommended")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("recommended_description")}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={localizedPath(locale, "/opportunities")}>{t("browse_all")}</Link>
          </Button>
        </div>

        {recommendedOpportunities.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {recommendedOpportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t("no_recommended")}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
