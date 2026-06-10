import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLinkIcon, FileTextIcon, GlobeIcon, InstagramIcon, MailIcon, MusicIcon, VideoIcon } from "lucide-react";
import { Toaster } from "sonner";

import { EPKDownloadButton } from "@/components/EPKDownloadButton";
import { EPKShareButton } from "@/components/EPKShareButton";
import { EmbedPlayer } from "@/components/EmbedPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEmbedUrl } from "@/lib/getEmbedUrl";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Performance, PortfolioItem, PressPhoto, PressQuote, Profile, TechRider } from "@/lib/types";

type EPKPageProps = {
  params: Promise<{ slug: string }>;
};

type EPKData = {
  profile: Profile;
  portfolioItems: PortfolioItem[];
  performances: Performance[];
  pressPhotos: PressPhoto[];
  techRider: TechRider | null;
};

function truncate(value: string | null, length: number) {
  if (!value) {
    return "Electronic press kit PaxKonnect";
  }

  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

async function getEPKData(slug: string): Promise<EPKData | null> {
  const supabase = createAdminClient();
  // Same visibility rule as the public_profiles view: only artist profiles are public.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .eq("role", "artist")
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const [portfolioResponse, performancesResponse, photosResponse, riderResponse] = await Promise.all([
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("performances")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("is_public", true)
      .order("performance_date", { ascending: false })
      .limit(5),
    supabase
      .from("press_photos")
      .select("*")
      .eq("profile_id", profile.id)
      .order("sort_order", { ascending: true }),
    supabase.from("tech_riders").select("*").eq("profile_id", profile.id).maybeSingle(),
  ]);

  return {
    profile,
    portfolioItems: portfolioResponse.data ?? [],
    performances: performancesResponse.data ?? [],
    pressPhotos: photosResponse.data ?? [],
    techRider: riderResponse.data ?? null,
  };
}

export async function generateMetadata({ params }: EPKPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEPKData(slug);

  if (!data) {
    return {
      title: "EPK — PaxKonnect",
    };
  }

  const title = `${data.profile.stage_name || data.profile.full_name || "Artiste"} — EPK PaxKonnect`;
  const description = truncate(data.profile.bio_pitch || data.profile.bio_short || data.profile.bio, 160);
  const primaryPhoto = data.pressPhotos.find((photo) => photo.is_primary) ?? data.pressPhotos[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [primaryPhoto?.url || data.profile.avatar_url || "/og-default.png"],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [primaryPhoto?.url || data.profile.avatar_url || "/og-default.png"],
    },
  };
}

function getEmbeddedMedia(items: PortfolioItem[]) {
  for (const item of items) {
    if (!item.url) {
      continue;
    }

    const embed = getEmbedUrl(item.url);

    if (embed.embedUrl) {
      return {
        title: item.title,
        url: item.url,
      };
    }
  }

  return null;
}

function getPressQuotes(profile: Profile): PressQuote[] {
  return Array.isArray(profile.press_quotes) ? profile.press_quotes : [];
}

function formatEPKStat(value: number) {
  return new Intl.NumberFormat("fr-BE").format(value);
}

function getOnlinePresenceStats(profile: Profile) {
  return [
    profile.monthly_listeners && profile.monthly_listeners > 0
      ? {
          className: "bg-emerald-50 text-emerald-800",
          label: `Spotify: ${formatEPKStat(profile.monthly_listeners)} auditeurs/mois`,
        }
      : null,
    profile.youtube_subscribers && profile.youtube_subscribers > 0
      ? {
          className: "bg-red-50 text-red-800",
          label: `YouTube: ${formatEPKStat(profile.youtube_subscribers)} abonnés`,
        }
      : null,
    profile.instagram_followers && profile.instagram_followers > 0
      ? {
          className: "bg-purple-50 text-purple-800",
          label: `Instagram: ${formatEPKStat(profile.instagram_followers)} abonnés`,
        }
      : null,
    profile.tiktok_followers && profile.tiktok_followers > 0
      ? {
          className: "bg-zinc-100 text-zinc-900",
          label: `TikTok: ${formatEPKStat(profile.tiktok_followers)} abonnés`,
        }
      : null,
  ].filter((stat): stat is { className: string; label: string } => Boolean(stat));
}

function formatFeeRange(profile: Profile) {
  if (!profile.fee_min && !profile.fee_max) {
    return null;
  }

  const currency = profile.fee_currency || "EUR";
  const formatter = new Intl.NumberFormat("fr-BE", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  });

  if (profile.fee_min && profile.fee_max) {
    return `${formatter.format(profile.fee_min)} — ${formatter.format(profile.fee_max)} / prestation`;
  }

  if (profile.fee_min) {
    return `${formatter.format(profile.fee_min)}+ / prestation`;
  }

  return `≤ ${formatter.format(profile.fee_max ?? 0)} / prestation`;
}

export default async function EPKPage({ params }: EPKPageProps) {
  const { slug } = await params;
  const data = await getEPKData(slug);

  if (!data) {
    notFound();
  }

  const { profile, portfolioItems, performances, pressPhotos, techRider } = data;
  const displayName = profile.stage_name || profile.full_name || "Artiste PaxKonnect";
  const primaryPhoto = pressPhotos.find((photo) => photo.is_primary) ?? pressPhotos[0];
  const embeddedMedia = getEmbeddedMedia(portfolioItems);
  const pressQuotes = getPressQuotes(profile);
  const disciplines = profile.artistic_disciplines?.join(" · ") || "Artiste indépendant";
  const epkPath = `/epk/${profile.slug || slug}`;
  const onlinePresenceStats = getOnlinePresenceStats(profile);
  const feeRange = formatFeeRange(profile);

  return (
    <main className="min-h-screen bg-white font-sans text-zinc-950">
      <Toaster richColors position="bottom-right" />
      <article className="mx-auto max-w-3xl bg-white shadow-2xl shadow-zinc-200/70 print:shadow-none">
        <section className="relative min-h-[420px] overflow-hidden bg-zinc-900">
          {primaryPhoto?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryPhoto.url} alt={displayName} className="absolute inset-0 size-full object-cover" />
          ) : profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={displayName} className="absolute inset-0 size-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">Electronic Press Kit</p>
            <h1 className="text-5xl font-black tracking-normal text-white sm:text-6xl">{displayName}</h1>
            {profile.avg_rating ? (
              <p className="mt-4 text-base font-semibold text-amber-200">
                ★ {Number(profile.avg_rating).toFixed(1)}/5 — {profile.review_count} avis vérifiés PaxKonnect
              </p>
            ) : null}
            <p className="mt-4 text-lg text-white/85">
              {disciplines} · {profile.city || "Belgique"}, Belgium
            </p>
            {profile.is_member ? <Badge className="mt-4 bg-amber-400 text-zinc-950">MonsPax Member ✓</Badge> : null}
          </div>
        </section>

        <div className="no-print sticky top-0 z-10 flex flex-col gap-3 border-b border-purple-100 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <EPKShareButton url={epkPath} label="Copier le lien" successLabel="Lien copié !" />
          <Button asChild variant="outline">
            <a href="#dossier-complet">
              <FileTextIcon data-icon="inline-start" />
              Voir le dossier complet
            </a>
          </Button>
          <EPKDownloadButton
            profile={profile}
            pressPhotos={pressPhotos}
            performances={performances}
            techRider={techRider}
            labels={{
              download: "Télécharger l'EPK complet (ZIP)",
              preparing: "Préparation du ZIP...",
              done: "ZIP téléchargé !",
            }}
          />
        </div>

        <div id="dossier-complet" className="flex flex-col gap-10 p-6 sm:p-10">
          <section>
            {profile.bio_pitch ? (
              <p className="text-2xl font-bold leading-snug text-purple-700">{profile.bio_pitch}</p>
            ) : null}
            <div className="mt-5 space-y-4 text-base leading-8 text-zinc-700">
              {(profile.bio_short || profile.bio || "Bio à venir.").split("\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          {onlinePresenceStats.length > 0 ? (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Présence en ligne</h2>
              <div className="flex flex-wrap gap-3">
                {onlinePresenceStats.map((stat) => (
                  <span key={stat.label} className={`rounded-full px-4 py-2 text-sm font-semibold ${stat.className}`}>
                    {stat.label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {embeddedMedia?.url ? (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Media</h2>
              <EmbedPlayer url={embeddedMedia.url} title={embeddedMedia.title} />
            </section>
          ) : null}

          {performances.length > 0 ? (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Expériences notables</h2>
              <div className="space-y-3">
                {performances.map((performance) => (
                  <div key={performance.id} className="rounded-xl border border-purple-100 p-4">
                    <p className="font-bold">
                      {performance.event_name} · {new Date(`${performance.performance_date}T00:00:00`).getFullYear()}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {[performance.venue_name, performance.city, performance.audience_size].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {pressPhotos.length > 0 ? (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Photos de presse</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pressPhotos.slice(0, 4).map((photo) => (
                  <figure key={photo.id} className="group">
                    <div className="relative overflow-hidden rounded-xl border border-purple-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.caption || displayName} className="aspect-[4/3] w-full object-cover" />
                      <a
                        href={photo.url}
                        download
                        className="no-print absolute inset-x-4 bottom-4 translate-y-3 rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-purple-700 opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100"
                      >
                        Télécharger
                      </a>
                    </div>
                    {photo.caption || photo.photographer ? (
                      <figcaption className="mt-2 text-sm text-zinc-500">
                        {photo.caption}
                        {photo.photographer ? ` — ${photo.photographer}` : null}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {techRider ? (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Fiche technique</h2>
              <div className="flex flex-wrap gap-3">
                {techRider.stage_plan_url ? (
                  <Button asChild variant="outline">
                    <a href={techRider.stage_plan_url} target="_blank" rel="noreferrer">
                      <FileTextIcon data-icon="inline-start" />
                      Plan de scène PDF
                    </a>
                  </Button>
                ) : null}
                {techRider.patch_list_url ? (
                  <Button asChild variant="outline">
                    <a href={techRider.patch_list_url} target="_blank" rel="noreferrer">
                      <FileTextIcon data-icon="inline-start" />
                      Patch list PDF
                    </a>
                  </Button>
                ) : null}
              </div>
              {techRider.notes ? (
                <p className="mt-4 rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm leading-7 text-zinc-700">
                  {techRider.notes}
                </p>
              ) : null}
            </section>
          ) : null}

          {pressQuotes.length > 0 ? (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Ils en parlent</h2>
              <div className="space-y-4">
                {pressQuotes.map((quote) => (
                  <blockquote key={`${quote.quote}-${quote.source}`} className="border-l-4 border-purple-600 pl-4">
                    <p className="text-lg font-semibold leading-7">“{quote.quote}”</p>
                    <footer className="mt-2 text-sm text-zinc-500">
                      {quote.source}
                      {quote.year ? `, ${quote.year}` : null}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-4 text-2xl font-bold">Liens</h2>
            <div className="flex flex-wrap gap-3">
              <SocialIconLink href={profile.spotify_url} label="Spotify" icon="music" />
              <SocialIconLink href={profile.youtube_url} label="YouTube" icon="video" />
              <SocialIconLink href={profile.tiktok_url} label="TikTok" icon="music" />
              <SocialIconLink href={profile.instagram_url} label="Instagram" icon="instagram" />
              <SocialIconLink href={profile.website_url} label="Web" icon="web" />
            </div>
          </section>

          <section className="rounded-2xl bg-purple-700 p-6 text-white">
            <h2 className="text-2xl font-bold">Contact booking</h2>
            {feeRange ? <p className="mt-3 font-semibold">Tarif indicatif: {feeRange}</p> : null}
            {profile.contact_email ? (
              <Button asChild className="mt-4 bg-white text-purple-700 hover:bg-amber-100">
                <a href={`mailto:${profile.contact_email}`}>
                  <MailIcon data-icon="inline-start" />
                  {profile.contact_email}
                </a>
              </Button>
            ) : (
              <p className="mt-3 text-white/80">Contact via les liens officiels de l&apos;artiste.</p>
            )}
          </section>

          <footer className="flex items-center justify-between border-t border-purple-100 pt-6 text-sm text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-purple-700 font-bold text-white">PK</span>
              <span>Géré via PaxKonnect</span>
            </div>
            <a href="https://paxkonnect.be" target="_blank" rel="noreferrer" className="font-semibold text-purple-700">
              paxkonnect.be
            </a>
          </footer>
        </div>
      </article>
    </main>
  );
}

function SocialIconLink({
  href,
  icon,
  label,
}: Readonly<{
  href: string | null;
  icon: "music" | "video" | "instagram" | "web";
  label: string;
}>) {
  if (!href) {
    return null;
  }

  const Icon =
    icon === "video" ? VideoIcon : icon === "instagram" ? InstagramIcon : icon === "web" ? GlobeIcon : MusicIcon;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100"
    >
      <Icon className="size-4" />
      {label}
      <ExternalLinkIcon className="size-3" />
    </a>
  );
}
