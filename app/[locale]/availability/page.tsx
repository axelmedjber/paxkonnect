import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { clearArtistAvailability, setArtistAvailability } from "@/app/actions/availability";
import { ActionFeedbackButton, ActionFeedbackForm } from "@/components/ActionFeedbackForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { localizedPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { ArtistAvailability, AvailabilityStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type AvailabilityPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
};

const statuses: AvailabilityStatus[] = ["available", "tentative", "unavailable"];

const statusStyles: Record<AvailabilityStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  tentative: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  unavailable: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
};

function getMonthStart(monthParam: string | undefined) {
  const match = monthParam?.match(/^(\d{4})-(\d{2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (Number.isInteger(year) && month >= 0 && month <= 11) {
      return new Date(Date.UTC(year, month, 1));
    }
  }

  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
}

function formatMonthParam(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatDateParam(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function getCalendarDays(monthStart: Date) {
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;
  const days: Array<Date | null> = Array.from({ length: firstWeekday }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(Date.UTC(year, month, day)));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function getCalendarWeeks(days: Array<Date | null>) {
  const weeks: Array<Date[]> = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7).filter((day): day is Date => Boolean(day)));
  }

  return weeks;
}

export default async function AvailabilityPage({ params, searchParams }: AvailabilityPageProps) {
  const { locale } = await params;
  const { month } = await searchParams;
  const t = await getTranslations("availability");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "artist" && profile?.role !== "admin") {
    redirect(localizedPath(locale, "/dashboard"));
  }

  const monthStart = getMonthStart(month);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const [{ data: availabilityData, error }] = await Promise.all([
    supabase
      .from("artist_availability")
      .select("*")
      .eq("profile_id", user.id)
      .gte("date", formatDateParam(monthStart))
      .lte("date", formatDateParam(monthEnd)),
  ]);
  const availability = new Map(
    ((availabilityData ?? []) as ArtistAvailability[]).map((item) => [item.date, item]),
  );
  const days = getCalendarDays(monthStart);
  const weeks = getCalendarWeeks(days);
  const monthLabel = monthStart.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const previousMonth = formatMonthParam(addMonths(monthStart, -1));
  const nextMonth = formatMonthParam(addMonths(monthStart, 1));
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(Date.UTC(2026, 0, 5 + index)).toLocaleDateString(locale, {
      weekday: "short",
      timeZone: "UTC",
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={localizedPath(locale, `/artists/${user.id}`)}>{t("view_public_profile")}</Link>
        </Button>
      </section>

      {error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {t("load_error", { message: error.message })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="capitalize">{monthLabel}</CardTitle>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`${localizedPath(locale, "/availability")}?month=${previousMonth}`}>{t("previous_month")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`${localizedPath(locale, "/availability")}?month=${nextMonth}`}>{t("next_month")}</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="block md:hidden">
            <div className="space-y-4">
              {weeks.map((week, weekIndex) => {
                const weekAvailability = week
                  .map((day) => {
                    const date = formatDateParam(day);
                    return {
                      date,
                      day,
                      item: availability.get(date),
                    };
                  })
                  .filter((entry) => entry.item);
                const emptyDays = week
                  .map((day) => ({
                    date: formatDateParam(day),
                    label: day.toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                      weekday: "short",
                    }),
                  }))
                  .filter((entry) => !availability.has(entry.date));

                return (
                  <section key={`${formatMonthParam(monthStart)}-week-${weekIndex}`} className="rounded-xl border border-purple-100 p-3 dark:border-zinc-800">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold">
                        {t("week_label", { number: weekIndex + 1 })}
                      </h2>
                      {emptyDays.length > 0 ? (
                        <details className="group relative">
                          <summary className="cursor-pointer list-none rounded-md border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-50 dark:border-purple-900 dark:text-purple-200 dark:hover:bg-purple-950">
                            {t("add_availability")}
                          </summary>
                          <ActionFeedbackForm action={setArtistAvailability} className="absolute right-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-xl border border-purple-100 bg-background p-3 shadow-lg dark:border-zinc-800">
                            <input type="hidden" name="locale" value={locale} />
                            <select name="date" className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                              {emptyDays.map((entry) => (
                                <option key={entry.date} value={entry.date}>
                                  {entry.label}
                                </option>
                              ))}
                            </select>
                            <select name="status" defaultValue="available" className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                              {statuses.map((status) => (
                                <option key={status} value={status}>
                                  {t(`status_${status}`)}
                                </option>
                              ))}
                            </select>
                            <Input name="note" maxLength={240} placeholder={t("note_placeholder")} className="h-9 text-sm" />
                            <Button type="submit" size="sm">
                              {t("save_day")}
                            </Button>
                          </ActionFeedbackForm>
                        </details>
                      ) : null}
                    </div>

                    {weekAvailability.length > 0 ? (
                      <div className="space-y-2">
                        {weekAvailability.map(({ date, day, item }) => {
                          if (!item) {
                            return null;
                          }

                          return (
                            <details key={date} className="rounded-lg border border-purple-100 bg-background p-3 dark:border-zinc-800">
                              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold">
                                    {day.toLocaleDateString(locale, {
                                      day: "numeric",
                                      month: "long",
                                      timeZone: "UTC",
                                      weekday: "long",
                                    })}
                                  </p>
                                  {item.note ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.note}</p> : null}
                                </div>
                                <span className="flex shrink-0 items-center gap-2">
                                  <span className={cn("h-2.5 w-2.5 rounded-full", {
                                    "bg-emerald-500": item.status === "available",
                                    "bg-amber-500": item.status === "tentative",
                                    "bg-zinc-400": item.status === "unavailable",
                                  })} />
                                  <Badge variant="outline" className={cn("text-[11px]", statusStyles[item.status])}>
                                    {t(`status_${item.status}`)}
                                  </Badge>
                                </span>
                              </summary>
                              <ActionFeedbackForm action={setArtistAvailability} className="mt-3 flex flex-col gap-2 border-t border-purple-100 pt-3 dark:border-zinc-800">
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="date" value={date} />
                                <select name="status" defaultValue={item.status} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                                  {statuses.map((status) => (
                                    <option key={status} value={status}>
                                      {t(`status_${status}`)}
                                    </option>
                                  ))}
                                </select>
                                <Input name="note" maxLength={240} defaultValue={item.note ?? ""} placeholder={t("note_placeholder")} className="h-9 text-sm" />
                                <div className="grid grid-cols-2 gap-2">
                                  <Button type="submit" size="sm">
                                    {t("save_day")}
                                  </Button>
                                  <ActionFeedbackButton action={clearArtistAvailability} size="sm" variant="outline">
                                    {t("clear_day")}
                                  </ActionFeedbackButton>
                                </div>
                              </ActionFeedbackForm>
                            </details>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-purple-100 p-3 text-sm text-muted-foreground dark:border-zinc-800">
                        {t("week_empty")}
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          </div>

          <div className="hidden grid-cols-7 gap-2 md:grid">
            {weekdays.map((weekday) => (
              <div key={weekday} className="px-2 pb-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                {weekday}
              </div>
            ))}
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-40 rounded-lg border border-transparent" />;
              }

              const date = formatDateParam(day);
              const item = availability.get(date);

              return (
                <div key={date} className="min-h-40 rounded-lg border border-purple-100 bg-background p-2 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{day.getUTCDate()}</span>
                    {item ? (
                      <Badge variant="outline" className={cn("text-[11px]", statusStyles[item.status])}>
                        {t(`status_${item.status}`)}
                      </Badge>
                    ) : null}
                  </div>
                  {item?.note ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.note}</p> : null}
                  <ActionFeedbackForm action={setArtistAvailability} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="date" value={date} />
                    <select
                      name="status"
                      defaultValue={item?.status ?? "available"}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {t(`status_${status}`)}
                        </option>
                      ))}
                    </select>
                    <Input
                      name="note"
                      maxLength={240}
                      defaultValue={item?.note ?? ""}
                      placeholder={t("note_placeholder")}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" className="h-8 flex-1 text-xs">
                        {t("save_day")}
                      </Button>
                      {item ? (
                        <ActionFeedbackButton action={clearArtistAvailability} size="sm" variant="outline" className="h-8 text-xs">
                          {t("clear_day")}
                        </ActionFeedbackButton>
                      ) : null}
                    </div>
                  </ActionFeedbackForm>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
