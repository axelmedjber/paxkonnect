import { getTranslations } from "next-intl/server";

import { OpportunityCard } from "@/components/OpportunityCard";
import { createClient } from "@/lib/supabase/server";

export default async function OpportunitiesPage() {
  const t = await getTranslations("opportunities");
  const supabase = await createClient();
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .order("deadline", { ascending: true, nullsFirst: false });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      {opportunities && opportunities.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      )}
    </main>
  );
}
