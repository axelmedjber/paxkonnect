import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  createArtistReview,
  createOperatorOpportunity,
  toggleOperatorOpportunityActive,
  updateOperatorOpportunity,
} from "@/app/actions/operator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ArtistReview, Matching, Opportunity, OpportunityCategory, Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const categories: OpportunityCategory[] = ["radio", "podcast", "event", "contest", "residency", "other"];

type OperatorDashboardPageProps = {
  params: Promise<{ locale: string }>;
};

type OperatorOpportunity = Opportunity & {
  operator_id: string | null;
};
type AcceptedApplication = Matching & {
  opportunity: Pick<Opportunity, "id" | "title"> | null;
  profile: Pick<Profile, "id" | "full_name" | "stage_name"> | null;
};

type OperatorTranslations = Awaited<ReturnType<typeof getTranslations>>;
type FormAction = (formData: FormData) => void | Promise<void>;

const categoryLabelKeys: Record<OpportunityCategory, string> = {
  contest: "category_contest",
  event: "category_event",
  other: "category_other",
  podcast: "category_podcast",
  radio: "category_radio",
  residency: "category_residency",
};

export default async function OperatorDashboardPage({ params }: OperatorDashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations("operator_dashboard");
  const common = await getTranslations("common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,stage_name,role,contact_email,city")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "operator") {
    redirect(localizedPath(locale, "/dashboard"));
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("opportunities")
    .select("*")
    .eq("operator_id", user.id)
    .order("created_at", { ascending: false });
  const opportunities = (data ?? []) as OperatorOpportunity[];
  const opportunityIds = opportunities.map((opportunity) => opportunity.id);
  const [{ data: acceptedApplicationsData }, { data: reviewsData }] = await Promise.all([
    opportunityIds.length > 0
      ? adminSupabase
          .from("matchings")
          .select("*, profile:profiles(id,full_name,stage_name), opportunity:opportunities(id,title)")
          .in("opportunity_id", opportunityIds)
          .eq("status", "accepted")
          .order("applied_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    adminSupabase.from("artist_reviews").select("*").eq("reviewer_id", user.id),
  ]);
  const acceptedApplications = (acceptedApplicationsData ?? []) as AcceptedApplication[];
  const reviews = (reviewsData ?? []) as ArtistReview[];
  const activeCount = opportunities.filter((opportunity) => opportunity.is_active).length;
  const inactiveCount = opportunities.length - activeCount;
  const displayName = profile.stage_name || profile.full_name || user.email || t("partner_fallback");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-purple-100 bg-card p-6 shadow-sm dark:border-zinc-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal">{t("title", { name: displayName })}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href={localizedPath(locale, "/artists")}>{t("browse_artists")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={localizedPath(locale, "/opportunities")}>{t("browse_opportunities")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={t("stats_total")} value={opportunities.length} />
        <StatCard label={t("stats_active")} value={activeCount} />
        <StatCard label={t("stats_inactive")} value={inactiveCount} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("create_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <OpportunityForm
              action={createOperatorOpportunity}
              locale={locale}
              submitLabel={t("create_submit")}
              t={t}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("my_opportunities")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {t("load_error", { message: error.message })}
              </p>
            ) : opportunities.length > 0 ? (
              opportunities.map((opportunity) => (
                <details key={opportunity.id} className="rounded-lg border bg-background p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{opportunity.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t(categoryLabelKeys[opportunity.category])} ·{" "}
                          {formatDate(opportunity.deadline, common("no_deadline"), locale)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={opportunity.is_active ? "default" : "outline"}>
                          {opportunity.is_active ? t("active") : t("inactive")}
                        </Badge>
                        <ToggleActiveForm
                          id={opportunity.id}
                          isActive={opportunity.is_active}
                          label={opportunity.is_active ? t("deactivate") : t("activate")}
                          locale={locale}
                        />
                      </div>
                    </div>
                  </summary>
                  <div className="mt-5 border-t pt-5">
                    <OpportunityForm
                      action={updateOperatorOpportunity}
                      locale={locale}
                      opportunity={opportunity}
                      submitLabel={t("update_submit")}
                      t={t}
                    />
                  </div>
                </details>
              ))
            ) : (
              <p className="rounded-lg border bg-background p-5 text-sm text-muted-foreground">
                {t("empty_opportunities")}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("reviews_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {acceptedApplications.length > 0 ? (
            acceptedApplications.map((application) => {
              const existingReview = reviews.find(
                (review) =>
                  review.profile_id === application.profile_id &&
                  review.opportunity_id === application.opportunity_id,
              );
              const artistName =
                application.profile?.stage_name ||
                application.profile?.full_name ||
                t("unknown_artist");

              return (
                <details key={application.id} className="rounded-lg border bg-background p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{artistName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {application.opportunity?.title || t("unknown_opportunity")}
                        </p>
                      </div>
                      <Badge variant={existingReview ? "gold" : "outline"}>
                        {existingReview ? t("reviews_published") : t("reviews_leave")}
                      </Badge>
                    </div>
                  </summary>
                  <div className="mt-4 border-t pt-4">
                    {existingReview ? (
                      <div className="rounded-md bg-muted p-3 text-sm">
                        <p className="font-semibold text-amber-600">{"★".repeat(existingReview.rating)}{"☆".repeat(5 - existingReview.rating)}</p>
                        {existingReview.comment ? <p className="mt-2 text-muted-foreground">{existingReview.comment}</p> : null}
                      </div>
                    ) : (
                      <ReviewForm
                        application={application}
                        locale={locale}
                        publishLabel={t("reviews_publish")}
                        ratingLabel={t("reviews_rating")}
                        commentLabel={t("reviews_comment")}
                      />
                    )}
                  </div>
                </details>
              );
            })
          ) : (
            <p className="rounded-lg border bg-background p-5 text-sm text-muted-foreground">
              {t("reviews_no_accepted")}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ReviewForm({
  application,
  commentLabel,
  locale,
  publishLabel,
  ratingLabel,
}: Readonly<{
  application: AcceptedApplication;
  commentLabel: string;
  locale: string;
  publishLabel: string;
  ratingLabel: string;
}>) {
  return (
    <form action={createArtistReview} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="profile_id" value={application.profile_id} />
      <input type="hidden" name="opportunity_id" value={application.opportunity_id} />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{ratingLabel}</legend>
        <div className="flex flex-row-reverse justify-end gap-1">
          {[5, 4, 3, 2, 1].map((rating) => (
            <label key={rating} className="group cursor-pointer">
              <input className="peer sr-only" type="radio" name="rating" value={rating} required />
              <span className="text-2xl text-muted-foreground transition-colors peer-checked:text-amber-500 group-hover:text-amber-500">★</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={commentLabel}>
        <Textarea name="comment" maxLength={500} rows={4} />
      </Field>
      <Button type="submit" className="w-fit">{publishLabel}</Button>
    </form>
  );
}

function StatCard({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({
  children,
  label,
}: Readonly<{
  children: ReactNode;
  label: string;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function OpportunityForm({
  action,
  locale,
  opportunity,
  submitLabel,
  t,
}: Readonly<{
  action: FormAction;
  locale: string;
  opportunity?: Opportunity;
  submitLabel: string;
  t: OperatorTranslations;
}>) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      {opportunity ? <input type="hidden" name="id" value={opportunity.id} /> : null}
      <Field label={t("field_title")}>
        <Input name="title" required defaultValue={opportunity?.title ?? ""} />
      </Field>
      <Field label={t("field_category")}>
        <select
          name="category"
          required
          defaultValue={opportunity?.category ?? "event"}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {t(categoryLabelKeys[category])}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label={t("field_description")}>
          <Textarea name="description" rows={5} defaultValue={opportunity?.description ?? ""} />
        </Field>
      </div>
      <Field label={t("field_location")}>
        <Input name="location" defaultValue={opportunity?.location ?? ""} />
      </Field>
      <Field label={t("field_organizer")}>
        <Input name="organizer" defaultValue={opportunity?.organizer ?? ""} />
      </Field>
      <Field label={t("field_contact_email")}>
        <Input type="email" name="contact_email" defaultValue={opportunity?.contact_email ?? ""} />
      </Field>
      <Field label={t("field_external_url")}>
        <Input type="url" name="external_url" defaultValue={opportunity?.external_url ?? ""} />
      </Field>
      <Field label={t("field_deadline")}>
        <Input type="date" name="deadline" defaultValue={opportunity?.deadline ?? ""} />
      </Field>
      <div className="flex items-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function ToggleActiveForm({
  id,
  isActive,
  label,
  locale,
}: Readonly<{
  id: string;
  isActive: boolean;
  label: string;
  locale: string;
}>) {
  return (
    <form action={toggleOperatorOpportunityActive}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="is_active" value={String(!isActive)} />
      <Button type="submit" size="sm" variant="outline">
        {label}
      </Button>
    </form>
  );
}
