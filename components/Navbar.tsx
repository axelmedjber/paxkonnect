import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Menu } from "lucide-react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const publicNavItems = [
  { href: "/artists", labelKey: "artists" },
  { href: "/opportunities", labelKey: "opportunities" },
  { href: "/places", labelKey: "places" },
] as const;

const authenticatedNavItems = [
  { href: "/dashboard", labelKey: "dashboard" },
  { href: "/availability", labelKey: "availability" },
  { href: "/messages", labelKey: "messages" },
] as const;

export async function Navbar({ locale }: Readonly<{ locale: string }>) {
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const navItems = user ? [...publicNavItems, ...authenticatedNavItems] : publicNavItems;
  let unreadMessages = 0;

  if (user) {
    const adminSupabase = createAdminClient();
    const { data: conversations } = await adminSupabase
      .from("conversations")
      .select("id")
      .or(`artist_id.eq.${user.id},operator_id.eq.${user.id}`);
    const conversationIds = conversations?.map((conversation) => conversation.id) ?? [];

    if (conversationIds.length > 0) {
      const { count } = await adminSupabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .is("read_at", null);

      unreadMessages = count ?? 0;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-purple-100 bg-background/95 backdrop-blur transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href={localizedPath(locale)} className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground transition-colors duration-200">
            {t("brand_mark")}
          </span>
          <span className="inline max-w-[8rem] truncate text-base font-semibold tracking-normal dark:text-zinc-100 sm:max-w-none sm:text-lg">
            {t("brand")}
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={localizedPath(locale, item.href)}
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground dark:hover:text-zinc-100"
            >
              {t(item.labelKey)}
              {item.href === "/messages" && unreadMessages > 0 ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {unreadMessages}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild size="sm" variant="outline">
                <Link href={localizedPath(locale, "/profile/edit")}>{t("account")}</Link>
              </Button>
              <SignOutButton />
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild size="sm" variant="outline">
                <Link href={localizedPath(locale, "/auth")}>{t("sign_in")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={localizedPath(locale, "/auth")}>{t("join")}</Link>
              </Button>
            </div>
          )}
          <details className="group relative md:hidden">
            <summary
              aria-label={t("menu")}
              className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md border border-purple-100 bg-background text-foreground transition-colors duration-200 hover:bg-muted [&::-webkit-details-marker]:hidden dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <Menu className="size-4" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-purple-100 bg-background p-3 shadow-lg transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950">
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={localizedPath(locale, item.href)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  >
                    {t(item.labelKey)}
                    {item.href === "/messages" && unreadMessages > 0 ? (
                      <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        {unreadMessages}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>
              <div className="mt-3 border-t border-purple-100 pt-3 dark:border-zinc-800">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-md bg-muted px-3 py-2 dark:bg-zinc-900">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("account")}
                      </p>
                      <p className="mt-1 truncate text-sm font-medium">{user.email}</p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href={localizedPath(locale, "/profile/edit")}>{t("edit_profile")}</Link>
                    </Button>
                    <SignOutButton />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button asChild size="sm" className="w-full">
                      <Link href={localizedPath(locale, "/auth")}>{t("join")}</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href={localizedPath(locale, "/auth")}>{t("sign_in")}</Link>
                    </Button>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t("theme_toggle")}</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
