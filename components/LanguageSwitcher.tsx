"use client";

import Link from "next/link";
import type { Route } from "next";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const languages = [
  { locale: "fr", key: "language_fr" },
  { locale: "en", key: "language_en" },
  { locale: "nl", key: "language_nl" },
  { locale: "de", key: "language_de" },
] as const;

function localizedHref(pathname: string, nextLocale: string, search: string): Route {
  const segments = pathname.split("/");
  segments[1] = nextLocale;
  const path = segments.join("/") || `/${nextLocale}`;

  return (search ? `${path}?${search}` : path) as Route;
}

function persistLocalePreference(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const currentLocale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md border bg-background p-0.5 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950 sm:gap-1 sm:p-1">
      {languages.map((language) => {
        const isActive = language.locale === currentLocale;

        return (
          <Link
            key={language.locale}
            href={localizedHref(pathname, language.locale, search)}
            className={cn(
              "rounded px-1 py-1 text-[10px] font-medium text-muted-foreground transition-colors duration-200 hover:text-primary sm:px-2 sm:text-xs",
              isActive && "bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
            hrefLang={language.locale}
            onClick={() => persistLocalePreference(language.locale)}
          >
            {t(language.key)}
          </Link>
        );
      })}
    </div>
  );
}
