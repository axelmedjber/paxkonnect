import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { deleteOwnAccount } from "@/app/actions/account";
import { ActionFeedbackForm } from "@/components/ActionFeedbackForm";
import { ProfileEditTabs, type ProfileEditTab } from "@/components/ProfileEditTabs";
import { ProfileWelcomeBanner } from "@/components/ProfileWelcomeBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type EditProfilePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; welcome?: string }>;
};

const profileEditTabs: ProfileEditTab[] = ["profile", "portfolio", "epk", "availability"];

function getActiveTab(value: string | undefined): ProfileEditTab {
  return profileEditTabs.some((tab) => tab === value) ? (value as ProfileEditTab) : "profile";
}

export default async function EditProfilePage({ params, searchParams }: EditProfilePageProps) {
  const { locale } = await params;
  const { tab, welcome } = await searchParams;
  const activeTab = getActiveTab(tab);
  const t = await getTranslations("profile_edit");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const now = new Date();
  const adminSupabase = createAdminClient();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().slice(0, 10);
  const [
    { data: profile },
    { data: portfolioItems },
    { data: performances },
    { data: pressPhotos },
    { data: techRider },
    { data: availabilityItems },
    { data: spotifyData },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("performances")
      .select("*")
      .eq("profile_id", user.id)
      .order("performance_date", { ascending: false }),
    supabase
      .from("press_photos")
      .select("*")
      .eq("profile_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase.from("tech_riders").select("*").eq("profile_id", user.id).maybeSingle(),
    supabase
      .from("artist_availability")
      .select("*")
      .eq("profile_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true }),
    adminSupabase
      .from("spotify_data")
      .select("profile_id,spotify_id,top_tracks,synced_at")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("description")}</p>
      </div>
      <ProfileWelcomeBanner show={welcome === "1"} />
      <ProfileEditTabs
        activeTab={activeTab}
        availabilityItems={availabilityItems ?? []}
        locale={locale}
        performances={performances ?? []}
        portfolioItems={portfolioItems ?? []}
        profile={profile}
        pressPhotos={pressPhotos ?? []}
        spotifyData={spotifyData}
        techRider={techRider ?? null}
        userId={user.id}
      />
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{t("danger_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-muted-foreground">{t("danger_description")}</p>
          <ActionFeedbackForm action={deleteOwnAccount} confirmMessage={t("danger_confirm")}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="destructive">
              {t("danger_delete")}
            </Button>
          </ActionFeedbackForm>
        </CardContent>
      </Card>
    </main>
  );
}
