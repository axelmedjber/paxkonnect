import { getTranslations } from "next-intl/server";

import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribeToken";
import { createAdminClient } from "@/lib/supabase/admin";

type UnsubscribePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;
  const t = await getTranslations("notifications");
  const profileId = verifyUnsubscribeToken(token);
  let confirmed = false;

  if (profileId) {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("profiles")
      .update({ notifications_opt_out: true })
      .eq("id", profileId);

    confirmed = !error;
  }

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-purple-100 bg-card p-8 shadow-sm dark:border-zinc-800">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("alert_new_opportunity")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          {confirmed ? t("alert_unsubscribed") : t("alert_unsubscribe_error")}
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          {confirmed ? t("alert_unsubscribed_description") : t("alert_unsubscribe_error_description")}
        </p>
      </section>
    </main>
  );
}
