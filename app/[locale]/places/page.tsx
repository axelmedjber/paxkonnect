import { getTranslations, setRequestLocale } from "next-intl/server";

import { PlacesDirectory } from "@/components/PlacesDirectory";
import { createClient } from "@/lib/supabase/server";

type PlacesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PlacesPage({ params }: PlacesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("places");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("is_active", true)
    .order("city", { ascending: true })
    .order("name", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
        <p className="max-w-3xl text-muted-foreground">{t("description")}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          {t("load_error", { message: error.message })}
        </div>
      ) : (
        <PlacesDirectory places={data ?? []} />
      )}
    </main>
  );
}
