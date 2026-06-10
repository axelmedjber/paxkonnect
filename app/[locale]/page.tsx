import { ArrowRightIcon, RadioIcon, SearchIcon, SparklesIcon, UsersIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ArtistCard } from "@/components/ArtistCard";
import { CulturalMap } from "@/components/CulturalMap";
import { OpportunityCard } from "@/components/OpportunityCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localizedPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { Opportunity, Place, PublicProfile } from "@/lib/types";
import { getInitials } from "@/lib/utils";

type LandingData = {
  opportunities: Opportunity[];
  artists: PublicProfile[];
  featuredArtists: PublicProfile[];
  places: Place[];
  error: string | null;
};

async function getLandingData(): Promise<LandingData> {
  try {
    const supabase = await createClient();

    const [opportunitiesResponse, artistsResponse, featuredArtistsResponse, placesResponse] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*")
        .eq("is_active", true)
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(3),
      supabase
        .from("public_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("public_profiles")
        .select("*")
        .eq("is_featured", true)
        .order("featured_month", { ascending: false, nullsFirst: false })
        .limit(5),
      supabase
        .from("places")
        .select("*")
        .eq("is_active", true),
    ]);

    return {
      opportunities: opportunitiesResponse.data ?? [],
      artists: artistsResponse.data ?? [],
      featuredArtists: featuredArtistsResponse.data ?? [],
      places: (placesResponse.data ?? []) as Place[],
      error:
        opportunitiesResponse.error?.message ??
        artistsResponse.error?.message ??
        featuredArtistsResponse.error?.message ??
        placesResponse.error?.message ??
        null,
    };
  } catch (error) {
    return {
      opportunities: [],
      artists: [],
      featuredArtists: [],
      places: [],
      error: error instanceof Error ? error.message : "Unable to connect to Supabase.",
    };
  }
}

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const { opportunities, artists, featuredArtists, places, error } = await getLandingData();
  const highlightedArtists = featuredArtists.length > 0 ? featuredArtists : artists.slice(0, 3);
  const steps = [
    {
      title: t("step_profile_title"),
      description: t("step_profile_description"),
      icon: SparklesIcon,
    },
    {
      title: t("step_opportunities_title"),
      description: t("step_opportunities_description"),
      icon: SearchIcon,
    },
    {
      title: t("step_connect_title"),
      description: t("step_connect_description"),
      icon: RadioIcon,
    },
  ] as const;

  return (
    <div className="flex flex-col">
      <section className="hero-gradient-bg overflow-hidden border-b">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:px-6 md:flex-row lg:px-8">
          <div className="flex min-w-0 w-full max-w-[22rem] flex-col items-start gap-7 sm:max-w-none md:flex-1">
            <Badge variant="gold">{t("hero_badge")}</Badge>
            <div className="flex min-w-0 max-w-full flex-col gap-5">
              <h1 className="max-w-full break-words bg-gradient-to-r from-primary via-[#8f3ded] to-accent bg-clip-text text-[2.45rem] font-black leading-[1.04] tracking-normal text-transparent sm:text-5xl md:text-7xl">
                {t("hero_title")}
              </h1>
              <p className="max-w-full break-words text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 md:max-w-2xl">
                {t("hero_body")}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full bg-primary text-primary-foreground shadow-sm hover:bg-accent hover:text-accent-foreground sm:w-auto"
              >
                <Link href={`${localizedPath(locale, "/auth")}?role=artist` as Route}>
                  {t("hero_cta_join")}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-accent/60 bg-transparent text-accent hover:bg-accent/10 sm:w-auto"
              >
                <Link href={`${localizedPath(locale, "/auth")}?role=operator` as Route}>
                  {t("hero_cta_partner")}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-primary/30 bg-transparent text-primary hover:bg-primary/10 sm:w-auto"
              >
                <Link href={localizedPath(locale, "/opportunities")}>{t("hero_cta_opportunities")}</Link>
              </Button>
            </div>
          </div>
          <div data-testid="hero-mockup" className="hidden w-full justify-end md:flex md:flex-1">
            <div className="w-full max-w-sm rounded-lg border bg-card/95 p-5 shadow-sm backdrop-blur transition-colors duration-200 dark:border-zinc-800">
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border bg-background p-4 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <UsersIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("float_profile_label")}</p>
                      <p className="font-semibold">{t("float_profile_value")}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-accent/15 text-accent">
                      <SparklesIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("float_opportunity_label")}</p>
                      <p className="font-semibold">{t("float_opportunity_value")}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-secondary p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <UsersIcon className="h-4 w-4" />
                    <p className="text-sm font-semibold">
                      <AnimatedCounter value={artists.length} /> {t("artists_short")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-accent">
                    <SparklesIcon className="h-4 w-4" />
                    <p className="text-sm font-semibold">
                      <AnimatedCounter value={opportunities.length} /> {t("opportunities_short")}
                    </p>
                  </div>
                </div>
                <p className="rounded-lg border bg-background p-4 text-sm leading-6 text-muted-foreground transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950">
                  {t("disciplines_note")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="border-b bg-accent/10">
          <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-accent-foreground sm:px-6 lg:px-8">
            {t("supabase_warning", { message: error })}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-normal">{t("how_title")}</h2>
          <p className="max-w-2xl text-muted-foreground">
            {t("how_body")}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card
              key={step.title}
              className="border-purple-100 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800"
            >
              <CardHeader>
                <div className="mb-5 flex size-11 items-center justify-center rounded-md bg-secondary text-primary">
                  <step.icon data-icon="inline-start" />
                </div>
                <CardTitle>
                  {index + 1}. {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-normal">{t("latest_title")}</h2>
              <p className="text-muted-foreground">{t("latest_body")}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={localizedPath(locale, "/opportunities")}>{t("view_all")}</Link>
            </Button>
          </div>
          {opportunities.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {opportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          ) : (
            <EmptyData title={t("no_opportunities")} />
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold tracking-normal">{t("featured_title")}</h2>
            <p className="text-muted-foreground">{t("featured_subtitle")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={localizedPath(locale, "/artists")}>{t("browse_artists")}</Link>
          </Button>
        </div>
        {highlightedArtists.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {highlightedArtists.map((artist) => (
              artist.is_featured ? (
                <FeaturedArtistCard
                  key={artist.id}
                  artist={artist}
                  belgiumLabel={t("featured_belgium")}
                  featuredBadge={t("featured_badge")}
                  locale={locale}
                  monthlyListenersLabel={t("featured_monthly_listeners")}
                />
              ) : (
                <ArtistCard key={artist.id} artist={artist} />
              )
            ))}
          </div>
        ) : (
          <EmptyData title={t("no_artists")} />
        )}
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3">
            <h2 className="text-3xl font-semibold tracking-normal">{t("map_title")}</h2>
            <p className="max-w-2xl text-muted-foreground">{t("map_subtitle")}</p>
          </div>
          <CulturalMap places={places} />
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">{t("cta_title")}</h2>
            <p className="mt-3 max-w-xl text-primary-foreground/80">
              {t("cta_body")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary">
              <Link href={`${localizedPath(locale, "/auth")}?role=artist` as Route}>{t("hero_cta_join")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
              <Link href={`${localizedPath(locale, "/auth")}?role=operator` as Route}>{t("hero_cta_partner")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyData({ title }: Readonly<{ title: string }>) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}

function formatStat(value: number | null, locale: string) {
  return value && value > 0 ? new Intl.NumberFormat(locale).format(value) : null;
}

function FeaturedArtistCard({
  artist,
  belgiumLabel,
  featuredBadge,
  locale,
  monthlyListenersLabel,
}: Readonly<{
  artist: PublicProfile;
  belgiumLabel: string;
  featuredBadge: string;
  locale: string;
  monthlyListenersLabel: string;
}>) {
  const displayName = artist.stage_name || artist.full_name || "PaxKonnect";
  const monthlyListeners = formatStat(artist.monthly_listeners, locale);
  const instagramFollowers = formatStat(artist.instagram_followers, locale);
  const tiktokFollowers = formatStat(artist.tiktok_followers, locale);
  const youtubeSubscribers = formatStat(artist.youtube_subscribers, locale);
  const firstStat = monthlyListeners
    ? `${monthlyListeners} ${monthlyListenersLabel}`
    : instagramFollowers
      ? `${instagramFollowers} Instagram`
      : tiktokFollowers
        ? `${tiktokFollowers} TikTok`
        : youtubeSubscribers
          ? `${youtubeSubscribers} YouTube`
          : null;

  return (
    <Card className="overflow-hidden border-2 border-amber-400 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md dark:border-amber-500">
      <CardContent className="flex flex-col gap-5 p-5">
        <Badge variant="gold" className="w-fit">
          ⭐ {featuredBadge}
        </Badge>
        <div className="flex gap-4">
          <Avatar className="size-20">
            {artist.avatar_url ? <AvatarImage src={artist.avatar_url} alt={displayName} /> : null}
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link href={localizedPath(locale, `/artists/${artist.id}`)} className="text-lg font-semibold hover:text-primary">
              {displayName}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{artist.city || belgiumLabel}</p>
            {firstStat ? <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">{firstStat}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(artist.artistic_disciplines || []).slice(0, 4).map((discipline) => (
            <Badge key={discipline} variant="secondary" className="bg-primary/10 text-primary dark:bg-primary/20">
              {discipline}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
