"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { MapPinIcon, StarIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { localizedPath } from "@/lib/routes";
import type { PublicProfile } from "@/lib/types";
import { getInitials } from "@/lib/utils";

type ArtistCardProps = {
  artist: Pick<
    PublicProfile,
    "id" | "stage_name" | "full_name" | "city" | "artistic_disciplines" | "avatar_url" | "is_member" | "avg_rating"
  > & {
    performance_count?: number;
  };
};

export function ArtistCard({ artist }: ArtistCardProps) {
  const locale = useLocale();
  const t = useTranslations("artists");
  const common = useTranslations("common");
  const displayName = artist.stage_name || artist.full_name || t("independent_artist");

  return (
    <Card className="overflow-hidden border-purple-100 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-lg dark:border-zinc-800">
      <CardContent className="flex gap-4 p-5">
        <Avatar className="size-16">
          {artist.avatar_url ? <AvatarImage src={artist.avatar_url} alt={displayName} /> : null}
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={localizedPath(locale, `/artists/${artist.id}`)} className="font-semibold hover:text-primary">
              {displayName}
            </Link>
            {artist.is_member ? (
              <span title={t("member_artist")} aria-label={t("member_artist")}>
                <StarIcon className="size-4 fill-accent text-accent" />
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="size-3.5" aria-hidden="true" />
            {artist.city || common("belgium")}
          </p>
          {artist.avg_rating ? (
            <p className="mt-2 text-sm font-semibold text-amber-600">
              ★ {Number(artist.avg_rating).toFixed(1)}
            </p>
          ) : null}
          {artist.performance_count && artist.performance_count > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              🎤 {artist.performance_count} {t("performances_count")}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {(artist.artistic_disciplines || []).slice(0, 3).map((discipline) => (
              <Badge key={discipline} variant="secondary" className="bg-primary/10 text-primary dark:bg-primary/20">
                {discipline}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
