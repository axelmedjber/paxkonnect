import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath } from "@/lib/routes";

type PrivacyPageProps = {
  params: Promise<{ locale: string }>;
};

const sectionKeys = [
  "controller",
  "data",
  "purposes",
  "legal_basis",
  "public_visibility",
  "recipients",
  "retention",
  "rights",
  "deletion",
  "contact",
] as const;

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  return {
    title: `${t("title")} — PaxKonnect`,
    description: t("intro"),
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t("updated")}</p>
      <p className="mt-6 leading-7 text-muted-foreground">{t("intro")}</p>

      <div className="mt-10 flex flex-col gap-8">
        {sectionKeys.map((section) => (
          <section key={section}>
            <h2 className="text-xl font-semibold">{t(`${section}_title`)}</h2>
            <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">
              {t(`${section}_body`)}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-10 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        {t("deletion_hint")}{" "}
        <Link href={localizedPath(locale, "/profile/edit")} className="font-medium text-primary hover:underline">
          {t("deletion_hint_link")}
        </Link>
        .
      </p>
    </main>
  );
}
