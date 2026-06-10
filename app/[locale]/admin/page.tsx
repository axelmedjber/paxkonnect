import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { StarIcon } from "lucide-react";

import {
  createOpportunity,
  createPartner,
  createPlace,
  deleteOpportunity,
  toggleOpportunityActive,
  togglePartnerActive,
  toggleProfileFeatured,
  toggleProfileMember,
  togglePlaceActive,
  updateOpportunity,
} from "@/app/actions/admin";
import { AdminDeleteButton } from "@/components/AdminDeleteButton";
import { AdminMatchingStatusSelect } from "@/components/AdminMatchingStatusSelect";
import { AdminUserRoleSelect } from "@/components/AdminUserRoleSelect";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  Matching,
  MatchingStatus,
  Opportunity,
  OpportunityCategory,
  PartnerType,
  Place,
  PlaceType,
  Profile,
  ProfileRole,
} from "@/lib/types";
import { formatDate, getInitials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const opportunityCategories: OpportunityCategory[] = [
  "radio",
  "podcast",
  "event",
  "contest",
  "residency",
  "other",
];
const partnerTypes: PartnerType[] = ["radio", "podcast", "venue", "festival", "institution", "other"];
const matchingStatuses: MatchingStatus[] = ["pending", "applied", "accepted", "rejected"];
const placeTypes: PlaceType[] = [
  "radio",
  "cultural_center",
  "concert_bar",
  "venue",
  "gallery",
  "festival",
  "studio",
  "other",
];
type AdminTranslations = Awaited<ReturnType<typeof getTranslations>>;
type FormAction = (formData: FormData) => void | Promise<void>;
const opportunityCategoryLabelKeys: Record<OpportunityCategory, string> = {
  radio: "category_radio",
  podcast: "category_podcast",
  event: "category_event",
  contest: "category_contest",
  residency: "category_residency",
  other: "category_other",
};
const partnerTypeLabelKeys: Record<PartnerType, string> = {
  radio: "partner_type_radio",
  podcast: "partner_type_podcast",
  venue: "partner_type_venue",
  festival: "partner_type_festival",
  institution: "partner_type_institution",
  other: "partner_type_other",
};
const placeTypeLabelKeys: Record<PlaceType, string> = {
  radio: "place_type_radio",
  cultural_center: "place_type_cultural_center",
  concert_bar: "place_type_concert_bar",
  venue: "place_type_venue",
  gallery: "place_type_gallery",
  festival: "place_type_festival",
  studio: "place_type_studio",
  other: "place_type_other",
};

type AdminPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ opportunity?: string; status?: string; tab?: string; users?: string }>;
};

type ApplicationRow = Matching & {
  opportunity: Pick<Opportunity, "id" | "title"> | null;
  profile: Pick<Profile, "full_name" | "stage_name"> | null;
};

type UserFilter = "all" | "artists" | "operators" | "members" | "standard";

type ProfileWithEmail = Profile & {
  email: string | null;
};

const userFilters: UserFilter[] = ["all", "artists", "operators", "members", "standard"];

function isUserFilter(value: string | undefined): value is UserFilter {
  return userFilters.some((filter) => filter === value);
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { locale } = await params;
  const filters = await searchParams;
  const activeTab = filters.tab === "users" ? "users" : "operations";
  const activeUserFilter = isUserFilter(filters.users) ? filters.users : "all";
  const t = await getTranslations("admin");
  const common = await getTranslations("common");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || serviceRoleKey === "your_service_role_key") {
    redirect(localizedPath(locale));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const adminSupabase = createAdminClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    profilesCountResponse,
    activeOpportunitiesCountResponse,
    monthlyApplicationsCountResponse,
    opportunitiesResponse,
    partnersResponse,
    placesResponse,
    applicationsResponse,
    profilesResponse,
    authUsersResponse,
  ] = await Promise.all([
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }),
    adminSupabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    adminSupabase
      .from("matchings")
      .select("id", { count: "exact", head: true })
      .gte("applied_at", monthStart.toISOString()),
    adminSupabase.from("opportunities").select("*").order("created_at", { ascending: false }),
    adminSupabase.from("partners").select("*").order("created_at", { ascending: false }),
    adminSupabase.from("places").select("*").order("name", { ascending: true }),
    adminSupabase
      .from("matchings")
      .select("*, profile:profiles(full_name,stage_name), opportunity:opportunities(id,title)")
      .order("applied_at", { ascending: false }),
    adminSupabase.from("profiles").select("*").order("created_at", { ascending: false }),
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const opportunities = opportunitiesResponse.data ?? [];
  const partners = partnersResponse.data ?? [];
  const places = (placesResponse.data ?? []) as Place[];
  const emailByUserId = new Map(
    (authUsersResponse.data?.users ?? []).map((authUser) => [authUser.id, authUser.email ?? null]),
  );
  const profiles = (profilesResponse.data ?? []).map((profile) => ({
    ...profile,
    email: emailByUserId.get(profile.id) ?? null,
  })) as ProfileWithEmail[];
  const filteredProfiles = profiles.filter((profile) => {
    if (activeUserFilter === "artists") {
      return profile.role === "artist";
    }
    if (activeUserFilter === "operators") {
      return profile.role === "operator";
    }
    if (activeUserFilter === "members") {
      return profile.is_member;
    }
    if (activeUserFilter === "standard") {
      return !profile.is_member;
    }
    return true;
  });
  const userStats = {
    artists: profiles.filter((profile) => profile.role === "artist").length,
    featured: profiles.filter((profile) => profile.is_featured).length,
    members: profiles.filter((profile) => profile.is_member).length,
    operators: profiles.filter((profile) => profile.role === "operator").length,
    admins: profiles.filter((profile) => profile.role === "admin").length,
  };
  const applications = ((applicationsResponse.data ?? []) as ApplicationRow[]).filter((application) => {
    const opportunityMatches =
      !filters.opportunity || application.opportunity_id === filters.opportunity;
    const statusMatches = !filters.status || application.status === filters.status;
    return opportunityMatches && statusMatches;
  });
  const allApplications = (applicationsResponse.data ?? []) as ApplicationRow[];
  const reportStats = buildReportStats({
    applications: allApplications,
    locale,
    opportunities,
    profiles,
  });

  const statusLabels: Record<MatchingStatus, string> = {
    pending: t("status_pending"),
    applied: t("status_applied"),
    accepted: t("status_accepted"),
    rejected: t("status_rejected"),
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("description")}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={t("total_artists")} value={profilesCountResponse.count ?? 0} />
        <StatCard
          label={t("active_opportunities")}
          value={activeOpportunitiesCountResponse.count ?? 0}
        />
        <StatCard
          label={t("applications_this_month")}
          value={monthlyApplicationsCountResponse.count ?? 0}
        />
      </section>

      <ReportingPanel
        categoryLabels={Object.fromEntries(
          opportunityCategories.map((category) => [category, t(opportunityCategoryLabelKeys[category])]),
        ) as Record<OpportunityCategory, string>}
        locale={locale}
        reports={reportStats}
        statusLabels={statusLabels}
        t={t}
      />

      <nav className="flex flex-wrap gap-2 rounded-lg border bg-card p-2">
        <Button asChild variant={activeTab === "operations" ? "default" : "ghost"}>
          <a href={localizedPath(locale, "/admin")}>{t("tab_operations")}</a>
        </Button>
        <Button asChild variant={activeTab === "users" ? "default" : "ghost"}>
          <a href={`${localizedPath(locale, "/admin")}?tab=users`}>{t("tab_users")}</a>
        </Button>
      </nav>

      {activeTab === "users" ? (
        <UsersManagementTab
          activeFilter={activeUserFilter}
          locale={locale}
          profiles={filteredProfiles}
          stats={userStats}
          t={t}
        />
      ) : (
        <>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("create_opportunity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <OpportunityForm
              action={createOpportunity}
              categories={opportunityCategories}
              locale={locale}
              submitLabel={t("create")}
              t={t}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("opportunities_management")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {opportunities.map((opportunity) => (
              <details key={opportunity.id} className="rounded-lg border bg-background p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{opportunity.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(opportunityCategoryLabelKeys[opportunity.category])} ·{" "}
                        {formatDate(opportunity.deadline, common("no_deadline"), locale)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={opportunity.is_active ? "default" : "outline"}>
                        {opportunity.is_active ? t("active") : t("inactive")}
                      </Badge>
                      <ToggleForm
                        action={toggleOpportunityActive}
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
                    action={updateOpportunity}
                    categories={opportunityCategories}
                    locale={locale}
                    opportunity={opportunity}
                    submitLabel={t("save")}
                    t={t}
                  />
                  <div className="mt-4">
                    <AdminDeleteButton
                      action={deleteOpportunity}
                      confirmMessage={t("confirm_delete_opportunity")}
                      id={opportunity.id}
                      label={t("delete")}
                      locale={locale}
                    />
                  </div>
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("create_partner")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PartnerForm action={createPartner} locale={locale} submitLabel={t("create")} t={t} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("partners_management")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{partner.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t(partnerTypeLabelKeys[partner.type])}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={partner.is_active ? "default" : "outline"}>
                    {partner.is_active ? t("active") : t("inactive")}
                  </Badge>
                  <ToggleForm
                    action={togglePartnerActive}
                    id={partner.id}
                    isActive={partner.is_active}
                    label={partner.is_active ? t("deactivate") : t("activate")}
                    locale={locale}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("create_place")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PlaceForm action={createPlace} locale={locale} submitLabel={t("create")} t={t} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("places_management")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {places.map((place) => (
              <div
                key={place.id}
                className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{place.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(placeTypeLabelKeys[place.type])}
                    {place.city ? ` · ${place.city}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={place.is_active ? "default" : "outline"}>
                    {place.is_active ? t("active") : t("inactive")}
                  </Badge>
                  <ToggleForm
                    action={togglePlaceActive}
                    id={place.id}
                    isActive={place.is_active}
                    label={place.is_active ? t("deactivate") : t("activate")}
                    locale={locale}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("applications_overview")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="locale" value={locale} />
            <select
              name="opportunity"
              defaultValue={filters.opportunity ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{t("all_opportunities")}</option>
              {opportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.title}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{t("all_statuses")}</option>
              {matchingStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              {t("filter")}
            </Button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">{t("artist")}</th>
                  <th className="py-3 pr-4 font-medium">{t("opportunity")}</th>
                  <th className="py-3 pr-4 font-medium">{t("status")}</th>
                  <th className="py-3 pr-4 font-medium">{t("applied_at")}</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      {application.profile?.stage_name ||
                        application.profile?.full_name ||
                        t("unknown_artist")}
                    </td>
                    <td className="py-3 pr-4">
                      {application.opportunity?.title || t("unknown_opportunity")}
                    </td>
                    <td className="py-3 pr-4">
                      <AdminMatchingStatusSelect
                        id={application.id}
                        labels={statusLabels}
                        locale={locale}
                        status={application.status}
                      />
                    </td>
                    <td className="py-3 pr-4">{formatDate(application.applied_at, common("no_deadline"), locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </main>
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

type ReportStats = {
  applicationsByMonth: Array<{ label: string; value: number }>;
  applicationsByStatus: Array<{ label: MatchingStatus; value: number }>;
  opportunitiesByCategory: Array<{ label: OpportunityCategory; value: number }>;
  totals: {
    acceptedApplications: number;
    memberRate: number;
    operators: number;
    totalMembers: number;
  };
};

function buildReportStats({
  applications,
  locale,
  opportunities,
  profiles,
}: Readonly<{
  applications: ApplicationRow[];
  locale: string;
  opportunities: Opportunity[];
  profiles: ProfileWithEmail[];
}>): ReportStats {
  const applicationsByStatus = matchingStatuses.map((status) => ({
    label: status,
    value: applications.filter((application) => application.status === status).length,
  }));
  const opportunitiesByCategory = opportunityCategories.map((category) => ({
    label: category,
    value: opportunities.filter((opportunity) => opportunity.category === category).length,
  }));
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" });
  const monthStarts = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));
    return date;
  });

  return {
    applicationsByMonth: monthStarts.map((date) => {
      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return {
        label: monthFormatter.format(date),
        value: applications.filter((application) => {
          const appliedAt = new Date(application.applied_at);
          return appliedAt >= date && appliedAt < nextMonth;
        }).length,
      };
    }),
    applicationsByStatus,
    opportunitiesByCategory,
    totals: {
      acceptedApplications: applicationsByStatus.find((item) => item.label === "accepted")?.value ?? 0,
      memberRate: profiles.length
        ? Math.round((profiles.filter((profile) => profile.is_member).length / profiles.length) * 100)
        : 0,
      operators: profiles.filter((profile) => profile.role === "operator").length,
      totalMembers: profiles.filter((profile) => profile.is_member).length,
    },
  };
}

function ReportingPanel({
  categoryLabels,
  locale,
  reports,
  statusLabels,
  t,
}: Readonly<{
  categoryLabels: Record<OpportunityCategory, string>;
  locale: string;
  reports: ReportStats;
  statusLabels: Record<MatchingStatus, string>;
  t: AdminTranslations;
}>) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t("reporting_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t("reporting_description")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label={t("reporting_members")} value={reports.totals.totalMembers} />
            <MiniMetric label={t("reporting_member_rate")} value={`${reports.totals.memberRate}%`} />
            <MiniMetric label={t("reporting_accepted")} value={reports.totals.acceptedApplications} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={`/api/admin/export?type=profiles&locale=${locale}`}>{t("export_profiles")}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/api/admin/export?type=opportunities&locale=${locale}`}>{t("export_opportunities")}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/api/admin/export?type=applications&locale=${locale}`}>{t("export_applications")}</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <BarChart
          title={t("chart_applications_by_status")}
          items={reports.applicationsByStatus.map((item) => ({
            label: statusLabels[item.label],
            value: item.value,
          }))}
        />
        <BarChart
          title={t("chart_opportunities_by_category")}
          items={reports.opportunitiesByCategory.map((item) => ({
            label: categoryLabels[item.label],
            value: item.value,
          }))}
        />
        <BarChart title={t("chart_applications_by_month")} items={reports.applicationsByMonth} />
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}

function BarChart({
  items,
  title,
}: Readonly<{
  items: Array<{ label: string; value: number }>;
  title: string;
}>) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="grid gap-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="font-semibold">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (item.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function UsersManagementTab({
  activeFilter,
  locale,
  profiles,
  stats,
  t,
}: Readonly<{
  activeFilter: UserFilter;
  locale: string;
  profiles: ProfileWithEmail[];
  stats: {
    admins: number;
    artists: number;
    featured: number;
    members: number;
    operators: number;
  };
  t: AdminTranslations;
}>) {
  return (
    <section className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={t("users_stats_artists")} value={stats.artists} />
        <StatCard label={t("users_stats_members")} value={stats.members} />
        <StatCard label={t("users_stats_operators")} value={stats.operators} />
        <StatCard label={t("users_stats_admins")} value={stats.admins} />
      </div>
      {stats.featured >= 5 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {t("users_featured_limit_warning")}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t("users_management")}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {userFilters.map((filter) => (
                <Button
                  key={filter}
                  asChild
                  size="sm"
                  variant={activeFilter === filter ? "default" : "outline"}
                >
                  <a href={`${localizedPath(locale, "/admin")}?tab=users&users=${filter}`}>
                    {t(`users_filter_${filter}`)}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">{t("users_col_avatar")}</th>
                  <th className="py-3 pr-4 font-medium">{t("users_col_stage_name")}</th>
                  <th className="py-3 pr-4 font-medium">{t("users_col_email")}</th>
                  <th className="py-3 pr-4 font-medium">{t("users_col_role")}</th>
                  <th className="py-3 pr-4 font-medium">{t("users_col_member")}</th>
                  <th className="py-3 pr-4 font-medium">{t("users_col_featured")}</th>
                  <th className="py-3 pr-4 font-medium">{t("users_col_joined")}</th>
                  <th className="py-3 pr-4 font-medium">{t("users_col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Avatar className="size-10">
                        {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.stage_name ?? profile.full_name ?? "User"} /> : null}
                        <AvatarFallback>{getInitials(profile.stage_name || profile.full_name)}</AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {profile.stage_name || profile.full_name || t("unknown_artist")}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{profile.email || "—"}</td>
                    <td className="py-3 pr-4">
                      <AdminUserRoleSelect id={profile.id} locale={locale} role={profile.role as ProfileRole} />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={profile.is_member ? "gold" : "outline"}>
                          {profile.is_member ? t("users_member_badge") : t("users_standard_badge")}
                        </Badge>
                        <ToggleMemberForm
                          id={profile.id}
                          isMember={profile.is_member}
                          label={profile.is_member ? t("users_remove_member") : t("users_make_member")}
                          locale={locale}
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {profile.is_featured ? (
                          <Badge variant="gold" className="gap-1">
                            <StarIcon className="size-3 fill-current" />
                            {t("users_featured_badge")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t("users_not_featured_badge")}</Badge>
                        )}
                        <ToggleFeaturedForm
                          disabled={!profile.is_featured && stats.featured >= 5}
                          id={profile.id}
                          isFeatured={profile.is_featured}
                          label={profile.is_featured ? t("users_remove_featured") : t("users_make_featured")}
                          locale={locale}
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-4">{formatDate(profile.created_at, "—", locale)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={localizedPath(locale, `/artists/${profile.id}`)}>{t("users_view_profile")}</a>
                        </Button>
                        <Button asChild size="sm" variant="outline" disabled={!profile.slug}>
                          <a href={profile.slug ? `/epk/${profile.slug}` : "#"}>{t("users_view_epk")}</a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profiles.length === 0 ? (
              <p className="rounded-lg border bg-background p-5 text-sm text-muted-foreground">
                {t("users_empty")}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ToggleMemberForm({
  id,
  isMember,
  label,
  locale,
}: Readonly<{
  id: string;
  isMember: boolean;
  label: string;
  locale: string;
}>) {
  return (
    <form action={toggleProfileMember}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="is_member" value={String(!isMember)} />
      <Button type="submit" size="sm" variant="outline">
        {label}
      </Button>
    </form>
  );
}

function ToggleFeaturedForm({
  disabled,
  id,
  isFeatured,
  label,
  locale,
}: Readonly<{
  disabled: boolean;
  id: string;
  isFeatured: boolean;
  label: string;
  locale: string;
}>) {
  return (
    <form action={toggleProfileFeatured}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="is_featured" value={String(!isFeatured)} />
      <Button type="submit" size="sm" variant="outline" disabled={disabled}>
        {label}
      </Button>
    </form>
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
  categories,
  locale,
  opportunity,
  submitLabel,
  t,
}: Readonly<{
  action: FormAction;
  categories: OpportunityCategory[];
  locale: string;
  opportunity?: Opportunity;
  submitLabel: string;
  t: AdminTranslations;
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
          defaultValue={opportunity?.category ?? "radio"}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {t(opportunityCategoryLabelKeys[category])}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label={t("field_description")}>
          <Textarea name="description" defaultValue={opportunity?.description ?? ""} />
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

function PartnerForm({
  action,
  locale,
  submitLabel,
  t,
}: Readonly<{
  action: FormAction;
  locale: string;
  submitLabel: string;
  t: AdminTranslations;
}>) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t("field_name")}>
        <Input name="name" required />
      </Field>
      <Field label={t("field_type")}>
        <select name="type" required defaultValue="radio" className="h-10 rounded-md border bg-background px-3 text-sm">
          {partnerTypes.map((type) => (
            <option key={type} value={type}>
              {t(partnerTypeLabelKeys[type])}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("field_website")}>
        <Input type="url" name="website" />
      </Field>
      <Field label={t("field_contact_email")}>
        <Input type="email" name="contact_email" />
      </Field>
      <Field label={t("field_logo_url")}>
        <Input type="url" name="logo_url" />
      </Field>
      <div className="md:col-span-2">
        <Field label={t("field_description")}>
          <Textarea name="description" />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function PlaceForm({
  action,
  locale,
  submitLabel,
  t,
}: Readonly<{
  action: FormAction;
  locale: string;
  submitLabel: string;
  t: AdminTranslations;
}>) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t("field_name")}>
        <Input name="name" required />
      </Field>
      <Field label={t("field_place_type")}>
        <select name="type" required defaultValue="venue" className="h-10 rounded-md border bg-background px-3 text-sm">
          {placeTypes.map((type) => (
            <option key={type} value={type}>
              {t(placeTypeLabelKeys[type])}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("field_address")}>
        <Input name="address" />
      </Field>
      <Field label={t("field_city")}>
        <Input name="city" />
      </Field>
      <Field label={t("field_latitude")}>
        <Input type="number" name="latitude" required step="0.0000001" />
      </Field>
      <Field label={t("field_longitude")}>
        <Input type="number" name="longitude" required step="0.0000001" />
      </Field>
      <Field label={t("field_website")}>
        <Input type="url" name="website" />
      </Field>
      <div className="md:col-span-2">
        <Field label={t("field_description")}>
          <Textarea name="description" />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function ToggleForm({
  action,
  id,
  isActive,
  label,
  locale,
}: Readonly<{
  action: FormAction;
  id: string;
  isActive: boolean;
  label: string;
  locale: string;
}>) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="is_active" value={String(!isActive)} />
      <Button type="submit" size="sm" variant="outline">
        {label}
      </Button>
    </form>
  );
}
