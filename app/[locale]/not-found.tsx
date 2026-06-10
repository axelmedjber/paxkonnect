import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-start justify-center gap-5 px-4 sm:px-6 lg:px-8">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
        {t("not_found_label")}
      </p>
      <h1 className="text-3xl font-semibold">{t("not_found_title")}</h1>
      <p className="text-muted-foreground">{t("not_found_description")}</p>
      <Button asChild>
        <Link href="/fr">{t("return_home")}</Link>
      </Button>
    </main>
  );
}
