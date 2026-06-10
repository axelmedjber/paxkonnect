"use client";

import { CalendarIcon, FileTextIcon, LinkIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { EPKEditor } from "@/components/EPKEditor";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { localizedPath } from "@/lib/routes";
import type { ArtistAvailability, AvailabilityStatus, Performance, PortfolioItem, PressPhoto, Profile, SpotifyDataPublic, TechRider } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ProfileEditTab = "availability" | "epk" | "portfolio" | "profile";

type ProfileEditTabsProps = {
  activeTab: ProfileEditTab;
  availabilityItems: ArtistAvailability[];
  locale: string;
  performances: Performance[];
  portfolioItems: PortfolioItem[];
  pressPhotos: PressPhoto[];
  profile: Profile | null;
  techRider: TechRider | null;
  spotifyData: SpotifyDataPublic | null;
  userId: string;
};

const availabilityStyles: Record<AvailabilityStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  tentative: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  unavailable: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
};

export function ProfileEditTabs({
  activeTab,
  availabilityItems,
  locale,
  performances,
  portfolioItems,
  pressPhotos,
  profile,
  spotifyData,
  techRider,
  userId,
}: ProfileEditTabsProps) {
  const t = useTranslations("profile_edit");
  const router = useRouter();

  function handleTabChange(tab: string) {
    router.replace(`${localizedPath(locale, "/profile/edit")}?tab=${tab}`, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="profile">
          <UserIcon className="size-4" aria-hidden="true" />
          {t("tab_profile")}
        </TabsTrigger>
        <TabsTrigger value="portfolio">
          <LinkIcon className="size-4" aria-hidden="true" />
          {t("tab_portfolio")}
        </TabsTrigger>
        <TabsTrigger value="epk">
          <FileTextIcon className="size-4" aria-hidden="true" />
          {t("tab_epk")}
        </TabsTrigger>
        <TabsTrigger value="availability">
          <CalendarIcon className="size-4" aria-hidden="true" />
          {t("tab_availability")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileEditForm mode="profile" locale={locale} performances={performances} profile={profile} portfolioItems={portfolioItems} userId={userId} />
      </TabsContent>

      <TabsContent value="portfolio">
        <ProfileEditForm
          mode="portfolio"
          locale={locale}
          performances={performances}
          profile={profile}
          portfolioItems={portfolioItems}
          spotifyData={spotifyData}
          userId={userId}
        />
      </TabsContent>

      <TabsContent value="epk">
        <EPKEditor profile={profile} userId={userId} pressPhotos={pressPhotos} techRider={techRider} />
      </TabsContent>

      <TabsContent value="availability">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("availability_tab_title")}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">{t("availability_tab_description")}</p>
            </div>
            <Button asChild>
              <Link href={localizedPath(locale, "/availability")}>{t("availability_set")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {availabilityItems.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availabilityItems.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        {new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <Badge variant="outline" className={cn("text-[11px]", availabilityStyles[item.status])}>
                        {t(`availability_status_${item.status}`)}
                      </Badge>
                    </div>
                    {item.note ? <p className="mt-2 text-sm text-muted-foreground">{item.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border bg-background p-5 text-sm text-muted-foreground">
                {t("availability_empty")}
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
