import Link from "next/link";
import { useTranslations } from "next-intl";

import { localizedPath } from "@/lib/routes";

export function Footer({ locale }: Readonly<{ locale: string }>) {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-purple-100 bg-purple-50 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">{nav("brand")}</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {t("description")}
          </p>
          <p className="text-sm text-muted-foreground">
            © {year} {t("monspax")}
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-3 text-sm text-muted-foreground sm:grid-cols-4">
          <Link href={localizedPath(locale, "/artists")} className="hover:text-foreground">
            {nav("artists")}
          </Link>
          <Link href={localizedPath(locale, "/opportunities")} className="hover:text-foreground">
            {nav("opportunities")}
          </Link>
          <Link href={localizedPath(locale, "/auth")} className="hover:text-foreground">
            {t("join")}
          </Link>
          <a href="mailto:contact@monspax.be" className="hover:text-foreground">
            {t("monspax")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
