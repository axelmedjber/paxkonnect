"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { getEmbedUrl, type EmbedType } from "@/lib/getEmbedUrl";
import { cn } from "@/lib/utils";

interface EmbedPlayerProps {
  url: string;
  title?: string;
}

const platformNames: Partial<Record<EmbedType, string>> = {
  bandcamp: "Bandcamp",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  tiktok: "TikTok",
  unknown: "Lien externe",
  vimeo: "Vimeo",
  youtube: "YouTube",
};

const linkClasses: Partial<Record<EmbedType, string>> = {
  bandcamp: "bg-blue-600 text-white hover:bg-blue-700",
  tiktok: "bg-black text-white hover:bg-zinc-800",
  unknown: "bg-zinc-700 text-white hover:bg-zinc-800",
  youtube: "bg-red-600 text-white hover:bg-red-700",
};

export function EmbedPlayer({ url, title }: EmbedPlayerProps) {
  const t = useTranslations("portfolio_item");
  const embed = getEmbedUrl(url);

  if (embed.type === "spotify" && embed.embedUrl) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <iframe
          src={embed.embedUrl}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={title || "Spotify player"}
        />
      </div>
    );
  }

  if (embed.type === "youtube" && embed.embedUrl) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border">
        <iframe
          src={embed.embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title={title || "YouTube player"}
        />
      </div>
    );
  }

  if (embed.type === "soundcloud" && embed.embedUrl) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <iframe
          src={embed.embedUrl}
          width="100%"
          height="166"
          frameBorder="0"
          allow="autoplay"
          loading="lazy"
          title={title || "SoundCloud player"}
        />
      </div>
    );
  }

  if (embed.type === "vimeo" && embed.embedUrl) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border">
        <iframe
          src={embed.embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title={title || "Vimeo player"}
        />
      </div>
    );
  }

  const platformName = platformNames[embed.type] || "Lien";

  return (
    <a
      href={embed.originalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90",
        linkClasses[embed.type] || "bg-zinc-700 text-white hover:bg-zinc-800",
      )}
    >
      <ExternalLinkIcon className="size-4" />
      {t("listen_on")} {platformName}
    </a>
  );
}
