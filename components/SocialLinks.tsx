import { GlobeIcon, InstagramIcon, MusicIcon, VideoIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Profile } from "@/lib/types";

type SocialLinksProps = {
  profile: Pick<
    Profile,
    "website_url" | "spotify_url" | "youtube_url" | "tiktok_url" | "instagram_url"
  >;
};

const linkClass = "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary";

export function SocialLinks({ profile }: SocialLinksProps) {
  const t = useTranslations("common");
  const links = [
    { href: profile.website_url, label: t("website"), icon: GlobeIcon },
    { href: profile.spotify_url, label: t("spotify"), icon: MusicIcon },
    { href: profile.youtube_url, label: t("youtube"), icon: VideoIcon },
    { href: profile.tiktok_url, label: t("tiktok"), icon: MusicIcon },
    { href: profile.instagram_url, label: t("instagram"), icon: InstagramIcon },
  ].filter((link): link is { href: string; label: string; icon: typeof GlobeIcon } =>
    Boolean(link.href),
  );

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-4">
      {links.map(({ href, label, icon: Icon }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" className={linkClass}>
          <Icon data-icon="inline-start" />
          {label}
        </a>
      ))}
    </div>
  );
}
