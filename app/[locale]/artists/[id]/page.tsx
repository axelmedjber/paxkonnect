import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import {
  BanknoteIcon,
  CalendarDaysIcon,
  CameraIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InstagramIcon,
  MailIcon,
  MessageCircleIcon,
  MusicIcon,
  PlayCircleIcon,
  SparklesIcon,
  StarIcon,
  VideoIcon,
} from "lucide-react";

import { EmbedPlayer } from "@/components/EmbedPlayer";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEmbedUrl, type EmbedType } from "@/lib/getEmbedUrl";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ArtistAvailability,
  ArtistReview,
  AvailabilityStatus,
  Opportunity,
  Performance,
  PortfolioItem as PortfolioItemRecord,
  PublicProfile,
  SpotifyDataPublic,
} from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";

type ArtistProfilePageProps = {
  params: Promise<{ id: string; locale: string }>;
};

type ReviewRow = ArtistReview & {
  opportunity: Pick<Opportunity, "title"> | null;
};

type ContactProfile = Pick<PublicProfile, "id"> & {
  contact_email: string | null;
};

type ArtistStat = {
  Icon: typeof MusicIcon;
  label: string;
  platform: string;
  value: string;
};

type NetworkLink = {
  href: string;
  icon: typeof GlobeIcon;
  label: string;
};

const embedPriority: Record<EmbedType, number> = {
  spotify: 1,
  soundcloud: 2,
  youtube: 3,
  vimeo: 4,
  bandcamp: 5,
  tiktok: 6,
  unknown: 7,
};

function truncateDescription(value: string | null | undefined) {
  if (!value) {
    return "Independent Belgian artist on PaxKonnect";
  }

  return value.length > 160 ? `${value.slice(0, 157)}...` : value;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function getArtistStats(profile: PublicProfile, locale: string, labels: { followers: string; monthlyListeners: string }) {
  return [
    profile.monthly_listeners && profile.monthly_listeners > 0
      ? {
          Icon: MusicIcon,
          label: labels.monthlyListeners,
          platform: "Spotify",
          value: formatNumber(profile.monthly_listeners, locale),
        }
      : null,
    profile.spotify_followers && profile.spotify_followers > 0
      ? {
          Icon: MusicIcon,
          label: labels.followers,
          platform: "Spotify",
          value: formatNumber(profile.spotify_followers, locale),
        }
      : null,
    profile.youtube_subscribers && profile.youtube_subscribers > 0
      ? {
          Icon: VideoIcon,
          label: labels.followers,
          platform: "YouTube",
          value: formatNumber(profile.youtube_subscribers, locale),
        }
      : null,
    profile.instagram_followers && profile.instagram_followers > 0
      ? {
          Icon: CameraIcon,
          label: labels.followers,
          platform: "Instagram",
          value: formatNumber(profile.instagram_followers, locale),
        }
      : null,
    profile.tiktok_followers && profile.tiktok_followers > 0
      ? {
          Icon: MusicIcon,
          label: labels.followers,
          platform: "TikTok",
          value: formatNumber(profile.tiktok_followers, locale),
        }
      : null,
  ].filter((stat): stat is ArtistStat => Boolean(stat));
}

function formatFeaturedMonth(month: string | null, locale: string) {
  const match = month?.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatFeeRange(profile: PublicProfile, locale: string, performanceLabel: string) {
  const currency = profile.fee_currency || "EUR";
  const formatter = new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  });

  if (profile.fee_min && profile.fee_max) {
    return `${formatter.format(profile.fee_min)} - ${formatter.format(profile.fee_max)} / ${performanceLabel}`;
  }

  if (profile.fee_min) {
    return `${formatter.format(profile.fee_min)}+ / ${performanceLabel}`;
  }

  if (profile.fee_max) {
    return `<= ${formatter.format(profile.fee_max)} / ${performanceLabel}`;
  }

  return null;
}

function getNetworkLinks(profile: PublicProfile, portfolio: PortfolioItemRecord[], labels: Record<string, string>) {
  const portfolioSoundCloud = portfolio.find((item) => item.url?.includes("soundcloud.com"))?.url ?? null;
  const links: Array<NetworkLink | null> = [
    profile.spotify_url ? { href: profile.spotify_url, icon: MusicIcon, label: labels.spotify } : null,
    profile.youtube_url ? { href: profile.youtube_url, icon: VideoIcon, label: labels.youtube } : null,
    profile.tiktok_url ? { href: profile.tiktok_url, icon: MusicIcon, label: labels.tiktok } : null,
    profile.instagram_url ? { href: profile.instagram_url, icon: InstagramIcon, label: labels.instagram } : null,
    portfolioSoundCloud ? { href: portfolioSoundCloud, icon: MusicIcon, label: labels.soundcloud } : null,
    profile.linktree_url ? { href: profile.linktree_url, icon: ExternalLinkIcon, label: labels.linktree } : null,
    profile.website_url ? { href: profile.website_url, icon: GlobeIcon, label: labels.website } : null,
  ];

  return links.filter((link): link is NetworkLink => Boolean(link));
}

export async function generateMetadata({ params }: ArtistProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: artist } = await supabase.from("public_profiles").select("*").eq("id", id).maybeSingle();

  if (!artist) {
    return {};
  }

  const title = `${artist.stage_name || artist.full_name || "Artist"} - PaxKonnect`;
  const description = truncateDescription(artist.bio_short || artist.bio);
  const image = artist.avatar_url || "/og-default.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  const t = await getTranslations("artist_profile");
  const artistsT = await getTranslations("artists");
  const common = await getTranslations("common");
  const { id, locale } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 45)
    .toISOString()
    .slice(0, 10);
  const [
    { data: artist },
    { data: portfolioItems },
    { data: availabilityItems },
    { data: reviewsData },
    { data: performancesData },
    { data: spotifyData },
    { data: contactProfile },
  ] = await Promise.all([
    supabase.from("public_profiles").select("*").eq("id", id).single(),
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("profile_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("artist_availability")
      .select("*")
      .eq("profile_id", id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .limit(8),
    supabase
      .from("artist_reviews")
      .select("*, opportunity:opportunities(title)")
      .eq("profile_id", id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("performances")
      .select("*")
      .eq("profile_id", id)
      .eq("is_public", true)
      .order("performance_date", { ascending: false })
      .limit(12),
    adminSupabase
      .from("spotify_data")
      .select("profile_id,spotify_id,top_tracks,synced_at")
      .eq("profile_id", id)
      .maybeSingle(),
    adminSupabase.from("profiles").select("id,contact_email").eq("id", id).maybeSingle(),
  ]);

  if (!artist) {
    notFound();
  }

  const portfolio = (portfolioItems ?? []) as PortfolioItemRecord[];
  const availability = (availabilityItems ?? []) as ArtistAvailability[];
  const reviews = (reviewsData ?? []) as ReviewRow[];
  const performances = (performancesData ?? []) as Performance[];
  const spotifyTopTracks = ((spotifyData as SpotifyDataPublic | null)?.top_tracks ?? []).slice(0, 3);
  const contactEmail = (contactProfile as ContactProfile | null)?.contact_email ?? null;
  const displayName = artist.stage_name || artist.full_name || artistsT("independent_artist");
  const featuredMonth = formatFeaturedMonth(artist.featured_month, locale);
  const stats = getArtistStats(artist, locale, {
    followers: t("stats_followers"),
    monthlyListeners: t("stats_monthly_listeners"),
  });
  const feeRange = formatFeeRange(artist, locale, t("fee_performance"));
  const mediaItems = portfolio
    .map((item) => ({ embed: item.url ? getEmbedUrl(item.url) : null, item }))
    .filter(({ embed }) => Boolean(embed?.embedUrl))
    .sort((a, b) => embedPriority[a.embed?.type ?? "unknown"] - embedPriority[b.embed?.type ?? "unknown"]);
  const mediaItemIds = new Set(mediaItems.map(({ item }) => item.id));
  const portfolioOnly = portfolio.filter((item) => !mediaItemIds.has(item.id));
  const networkLinks = getNetworkLinks(artist, portfolio, {
    instagram: common("instagram"),
    linktree: t("linktree"),
    soundcloud: t("soundcloud"),
    spotify: common("spotify"),
    tiktok: common("tiktok"),
    website: common("website"),
    youtube: common("youtube"),
  });
  const contactHref = contactEmail ? `mailto:${contactEmail}` : "mailto:contact@monspax.be";
  const profileSummary = artist.bio_long || artist.bio_short || artist.bio;

  return (
    <main className="bg-background">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#7C3AED_0%,#9F7AEA_48%,#F59E0B_100%)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.22),transparent_34%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
              <Avatar className="size-28 border-4 border-white/85 ring-4 ring-amber-300/70 sm:size-[132px]">
                {artist.avatar_url ? <AvatarImage src={artist.avatar_url} alt={displayName} /> : null}
                <AvatarFallback className="text-3xl text-primary">{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="max-w-3xl">
                <h1 className="text-4xl font-black tracking-normal sm:text-6xl">{displayName}</h1>
                <p className="mt-3 text-lg text-white/85">{artist.city || common("belgium")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(artist.artistic_disciplines || []).map((discipline: string) => (
                    <Badge key={discipline} className="border-white/20 bg-white/15 text-white">
                      {discipline}
                    </Badge>
                  ))}
                  {artist.is_member ? <Badge variant="gold">{t("member_badge")}</Badge> : null}
                  {artist.is_featured ? <Badge variant="gold">{t("featured_badge", { month: featuredMonth ?? "" })}</Badge> : null}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:self-start">
              <ShareProfileButton />
              {artist.slug ? (
                <Button asChild className="bg-white text-primary hover:bg-amber-100">
                  <a href={`/epk/${artist.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon data-icon="inline-start" />
                    {t("view_epk")}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          {stats.length > 0 || artist.avg_rating ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {stats.slice(0, 4).map(({ Icon, label, platform, value }) => (
                <div key={`${platform}-${label}`} className="rounded-lg border border-white/15 bg-white/12 p-4 backdrop-blur">
                  <Icon className="size-5 text-amber-200" />
                  <p className="mt-3 text-xl font-black">{value}</p>
                  <p className="text-sm text-white/80">
                    {label} · {platform}
                  </p>
                </div>
              ))}
              {artist.avg_rating ? (
                <div className="rounded-lg border border-white/15 bg-white/12 p-4 backdrop-blur">
                  <StarIcon className="size-5 fill-amber-200 text-amber-200" />
                  <p className="mt-3 text-xl font-black">{Number(artist.avg_rating).toFixed(1)}/5</p>
                  <p className="text-sm text-white/80">
                    {artist.review_count} {t("reviews_verified")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <ArtistMediaSection
        emptyLabel={t("media_empty")}
        items={mediaItems}
        subtitle={t("media_subtitle")}
        title={t("media_title")}
      />

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="flex flex-col gap-6">
          <ProfilePanel title={t("bio")}>
            <p className="leading-7 text-muted-foreground">{profileSummary || t("empty_bio")}</p>
          </ProfilePanel>
          <ProfilePanel title={t("disciplines")}>
            <div className="flex flex-wrap gap-2">
              {(artist.artistic_disciplines || []).map((discipline: string) => (
                <Badge key={discipline} variant="secondary">
                  {discipline}
                </Badge>
              ))}
            </div>
          </ProfilePanel>
          {feeRange ? (
            <ProfilePanel title={t("fee_title")}>
              <div className="flex items-start gap-3">
                <BanknoteIcon className="mt-1 size-5 text-primary" />
                <div>
                  <p className="font-semibold">{feeRange}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("fee_disclaimer")}</p>
                </div>
              </div>
            </ProfilePanel>
          ) : null}
          <AvailabilityPreview
            availability={availability}
            emptyLabel={t("availability_empty")}
            locale={locale}
            statusLabels={{
              available: t("availability_available"),
              tentative: t("availability_tentative"),
              unavailable: t("availability_unavailable"),
            }}
            title={t("availability")}
          />
        </div>

        <aside className="flex flex-col gap-6">
          <ProfilePanel title={t("networks_title")}>
            {networkLinks.length > 0 ? (
              <div className="grid gap-2">
                {networkLinks.map(({ href, icon: Icon, label }) => (
                  <a
                    key={`${label}-${href}`}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {label}
                    </span>
                    <ExternalLinkIcon className="size-3" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("links_empty")}</p>
            )}
          </ProfilePanel>

          <ProfilePanel title={t("stats_title")}>
            {stats.length > 0 ? (
              <div className="grid gap-3">
                {stats.map(({ Icon, label, platform, value }) => (
                  <div key={`${platform}-${label}`} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-purple-50 text-primary dark:bg-purple-950">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold">
                        {value} {label}
                      </p>
                      <p className="text-sm text-muted-foreground">{platform}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("stats_empty")}</p>
            )}
            {artist.avg_rating ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <p className="font-semibold">
                  {renderStars(Math.round(Number(artist.avg_rating)))} {Number(artist.avg_rating).toFixed(1)}/5
                </p>
                <p className="text-sm">{artist.review_count} {t("reviews_verified")}</p>
              </div>
            ) : null}
          </ProfilePanel>

          {performances.length > 0 ? (
            <ProfilePanel title={t("performances_title")}>
              <div className="space-y-3">
                {performances.slice(0, 4).map((performance) => (
                  <PerformanceMiniRow key={performance.id} locale={locale} performance={performance} />
                ))}
              </div>
            </ProfilePanel>
          ) : null}
        </aside>
      </section>

      {spotifyTopTracks.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
          <ProfilePanel title={t("spotify_top_tracks")}>
            <div className="flex flex-wrap gap-2">
              {spotifyTopTracks.map((track) => (
                <Button key={track.id} asChild variant="outline" size="sm">
                  <a href={track.external_url ?? "#"} target="_blank" rel="noreferrer">
                    <MusicIcon data-icon="inline-start" />
                    {track.name}
                  </a>
                </Button>
              ))}
            </div>
          </ProfilePanel>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader icon={SparklesIcon} title={t("portfolio")} subtitle={t("portfolio_subtitle")} />
        {portfolioOnly.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolioOnly.map((item) => (
              <article key={item.id} className="rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{item.title}</h3>
                  <Badge variant="secondary">{item.type}</Badge>
                </div>
                {item.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
                    {t("open_resource")}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel label={t("portfolio_empty")} />
        )}
      </section>

      {reviews.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeader icon={StarIcon} title={t("reviews_title")} subtitle={`${Number(artist.avg_rating ?? 0).toFixed(1)}/5 - ${artist.review_count} ${t("reviews_verified")}`} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-amber-600">{renderStars(review.rating)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(review.created_at, locale)}</p>
                </div>
                {review.comment ? <p className="mt-3 leading-7 text-muted-foreground">{review.comment}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {review.opportunity?.title ? <span>{review.opportunity.title}</span> : null}
                  <span>{t("reviews_verified")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {performances.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeader icon={CalendarDaysIcon} title={t("performances_title")} subtitle={`${performances.length} ${t("performances_count")}`} />
          <div className="mt-5 border-l border-amber-300 pl-5">
            {performances.map((performance) => (
              <PerformanceTimelineItem key={performance.id} performance={performance} peopleLabel={t("people")} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-purple-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.1),rgba(245,158,11,0.12))] p-6 shadow-sm dark:border-zinc-800">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-normal">{t("contact_cta_title", { name: displayName })}</h2>
              <p className="mt-2 text-muted-foreground">
                {contactEmail ? t("contact_email_available", { email: contactEmail }) : t("contact_cta_description")}
              </p>
            </div>
            <Button asChild className="bg-primary hover:bg-amber-500 hover:opacity-90">
              <a href={contactHref}>
                {contactEmail ? <MailIcon data-icon="inline-start" /> : <MessageCircleIcon data-icon="inline-start" />}
                {t("send_message")}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProfilePanel({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <section className="rounded-lg border border-purple-100 bg-card p-5 shadow-sm dark:border-zinc-800">
      <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SectionHeader({ icon: Icon, subtitle, title }: Readonly<{ icon: typeof MusicIcon; subtitle?: string; title: string }>) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-primary dark:bg-purple-950">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-2xl font-black tracking-normal sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function EmptyPanel({ label }: Readonly<{ label: string }>) {
  return <div className="mt-5 rounded-lg border bg-card p-8 text-sm text-muted-foreground">{label}</div>;
}

function ArtistMediaSection({
  emptyLabel,
  items,
  subtitle,
  title,
}: Readonly<{
  emptyLabel: string;
  items: Array<{ embed: ReturnType<typeof getEmbedUrl> | null; item: PortfolioItemRecord }>;
  subtitle: string;
  title: string;
}>) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader icon={PlayCircleIcon} title={title} subtitle={subtitle} />
      {items.length > 0 ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {items.map(({ item }) => (
            <article key={item.id} className="rounded-lg border border-purple-100 bg-card p-4 shadow-sm dark:border-zinc-800">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                </div>
                <Badge variant="secondary">{item.type}</Badge>
              </div>
              {item.url ? <EmbedPlayer title={item.title} url={item.url} /> : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyPanel label={emptyLabel} />
      )}
    </section>
  );
}

function formatDate(date: string, locale: string) {
  return new Date(date).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderStars(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))}`;
}

function PerformanceMiniRow({ locale, performance }: Readonly<{ locale: string; performance: Performance }>) {
  return (
    <article className="rounded-lg border bg-background p-3">
      <p className="font-semibold">{performance.event_name}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {[performance.venue_name, performance.city, formatDate(performance.performance_date, locale)].filter(Boolean).join(" · ")}
      </p>
    </article>
  );
}

function PerformanceTimelineItem({
  peopleLabel,
  performance,
}: Readonly<{
  peopleLabel: string;
  performance: Performance;
}>) {
  return (
    <article className="relative pb-5 last:pb-0">
      <span className="absolute -left-[1.68rem] top-1 flex size-3 rounded-full bg-amber-400" />
      <p className="font-semibold">
        {new Date(`${performance.performance_date}T00:00:00`).getFullYear()} - {performance.event_name}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {[performance.venue_name, performance.city, performance.audience_size ? `${performance.audience_size} ${peopleLabel}` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {performance.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{performance.description}</p> : null}
    </article>
  );
}

const availabilityStyles: Record<AvailabilityStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  tentative: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  unavailable: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
};

function AvailabilityPreview({
  availability,
  emptyLabel,
  locale,
  statusLabels,
  title,
}: Readonly<{
  availability: ArtistAvailability[];
  emptyLabel: string;
  locale: string;
  statusLabels: Record<AvailabilityStatus, string>;
  title: string;
}>) {
  return (
    <section className="rounded-lg border border-purple-100 bg-card p-5 shadow-sm dark:border-zinc-800">
      <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
      {availability.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {availability.map((item) => (
            <div key={item.id} className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <Badge variant="outline" className={cn("text-[11px]", availabilityStyles[item.status])}>
                  {statusLabels[item.status]}
                </Badge>
              </div>
              {item.note ? <p className="mt-2 text-xs text-muted-foreground">{item.note}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  );
}
