"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { ArtistCard } from "@/components/ArtistCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const disciplines = [
  "music",
  "visual arts",
  "theatre",
  "dance",
  "literature",
  "film",
  "other",
] as const;

type Discipline = (typeof disciplines)[number];

type ArtistFiltersProps = {
  artists: Array<PublicProfile & { performance_count?: number }>;
};

const budgetFilters = ["all", "under_200", "200_500", "500_1000", "over_1000", "quote"] as const;
const ratingFilters = ["all", "3", "4", "5"] as const;

type BudgetFilter = (typeof budgetFilters)[number];
type RatingFilter = (typeof ratingFilters)[number];

function normalize(value: string | null | undefined) {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase() ?? "";
}

function hasDiscipline(artist: PublicProfile, selectedDisciplines: Discipline[]) {
  if (selectedDisciplines.length === 0) {
    return true;
  }

  return selectedDisciplines.some((discipline) =>
    artist.artistic_disciplines?.includes(discipline),
  );
}

function hasBudgetMatch(artist: PublicProfile, selectedBudget: BudgetFilter) {
  if (selectedBudget === "all") {
    return true;
  }

  if (!artist.fee_min && !artist.fee_max) {
    return true;
  }

  const feeMax = artist.fee_max ?? artist.fee_min;

  if (!feeMax) {
    return true;
  }

  if (selectedBudget === "under_200") {
    return feeMax < 200;
  }

  if (selectedBudget === "200_500") {
    return feeMax <= 500;
  }

  if (selectedBudget === "500_1000") {
    return feeMax <= 1000;
  }

  if (selectedBudget === "over_1000") {
    return feeMax > 1000;
  }

  return true;
}

function hasRatingMatch(artist: PublicProfile, selectedRating: RatingFilter) {
  if (selectedRating === "all") {
    return true;
  }

  return Number(artist.avg_rating ?? 0) >= Number(selectedRating);
}

export function ArtistFilters({ artists }: ArtistFiltersProps) {
  const locale = useLocale();
  const t = useTranslations("artists");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<BudgetFilter>("all");
  const [selectedRating, setSelectedRating] = useState<RatingFilter>("all");
  const [selectedDisciplines, setSelectedDisciplines] = useState<Discipline[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          artists
            .map((artist) => artist.city?.trim())
            .filter((city): city is string => Boolean(city)),
        ),
      ).sort((a, b) => a.localeCompare(b, locale)),
    [artists, locale],
  );

  const filteredArtists = useMemo(() => {
    const query = normalize(debouncedSearch);

    return artists.filter((artist) => {
      const nameMatches =
        !query ||
        normalize(artist.stage_name).includes(query) ||
        normalize(artist.full_name).includes(query);
      const cityMatches = !selectedCity || artist.city === selectedCity;

      return (
        nameMatches &&
        cityMatches &&
        hasDiscipline(artist, selectedDisciplines) &&
        hasBudgetMatch(artist, selectedBudget) &&
        hasRatingMatch(artist, selectedRating)
      );
    });
  }, [artists, debouncedSearch, selectedBudget, selectedCity, selectedDisciplines, selectedRating]);

  function toggleDiscipline(discipline: Discipline) {
    setSelectedDisciplines((current) =>
      current.includes(discipline)
        ? current.filter((item) => item !== discipline)
        : [...current, discipline],
    );
  }

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCity("");
    setSelectedBudget("all");
    setSelectedRating("all");
    setSelectedDisciplines([]);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-lg border border-purple-100 bg-card p-4 shadow-sm dark:border-zinc-800">
        <div className="grid gap-4 lg:grid-cols-[1fr_200px_200px_200px]">
          <label className="flex flex-col gap-2 text-sm font-medium">
            {t("search_label")}
            <span className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("search_placeholder")}
                className="pl-9 pr-10"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                  }}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t("clear_search")}
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            {t("city_label")}
            <select
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm transition-colors duration-200 dark:border-zinc-800"
            >
              <option value="">{t("all_cities")}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            {t("fee_filter")}
            <select
              value={selectedBudget}
              onChange={(event) => setSelectedBudget(event.target.value as BudgetFilter)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm transition-colors duration-200 dark:border-zinc-800"
            >
              {budgetFilters.map((budget) => (
                <option key={budget} value={budget}>
                  {t(`fee_budget_${budget}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            {t("rating_filter")}
            <select
              value={selectedRating}
              onChange={(event) => setSelectedRating(event.target.value as RatingFilter)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm transition-colors duration-200 dark:border-zinc-800"
            >
              {ratingFilters.map((rating) => (
                <option key={rating} value={rating}>
                  {t(`rating_filter_${rating}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-sm font-medium">{t("discipline_label")}</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            <button
              type="button"
              onClick={() => setSelectedDisciplines([])}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                selectedDisciplines.length === 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-purple-100 bg-background text-muted-foreground hover:border-primary hover:text-primary dark:border-zinc-800",
              )}
            >
              {t("all_disciplines_short")}
            </button>
            {disciplines.map((discipline) => {
              const active = selectedDisciplines.includes(discipline);

              return (
                <button
                  key={discipline}
                  type="button"
                  onClick={() => toggleDiscipline(discipline)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-purple-100 bg-background text-muted-foreground hover:border-primary hover:text-primary dark:border-zinc-800",
                  )}
                >
                  {t(`discipline_${discipline.replaceAll(" ", "_")}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {t("results_count", { count: filteredArtists.length })}
        </p>
        {(search || selectedCity || selectedBudget !== "all" || selectedRating !== "all" || selectedDisciplines.length > 0) ? (
          <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
            {t("clear_filters")}
          </Button>
        ) : null}
      </div>

      {filteredArtists.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredArtists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-purple-100 bg-card p-8 text-center shadow-sm dark:border-zinc-800">
          <p className="text-sm text-muted-foreground">{t("empty_filtered")}</p>
          <Button type="button" className="mt-4" onClick={resetFilters}>
            {t("clear_filters")}
          </Button>
        </div>
      )}
    </section>
  );
}
