import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";

import { ArtistFilters } from "@/components/ArtistFilters";
import { createClient } from "@/lib/supabase/server";

type ArtistsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ArtistsPage({ params }: ArtistsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("artists");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: performances } = await supabase
    .from("performances")
    .select("profile_id")
    .eq("is_public", true);
  const performanceCounts = new Map<string, number>();

  for (const performance of performances ?? []) {
    performanceCounts.set(performance.profile_id, (performanceCounts.get(performance.profile_id) ?? 0) + 1);
  }
  const artists = (data ?? []).map((artist) => ({
    ...artist,
    performance_count: performanceCounts.get(artist.id) ?? 0,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          {t("load_error", { message: error.message })}
        </div>
      ) : (
        <ArtistFilters artists={artists} />
      )}
    </main>
  );
}
