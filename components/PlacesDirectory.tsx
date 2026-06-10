"use client";

import mapboxgl from "mapbox-gl";
import { ExternalLinkIcon, MapPinIcon, SearchIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Place, PlaceType } from "@/lib/types";
import { cn } from "@/lib/utils";

const placeTypes: PlaceType[] = [
  "radio",
  "cultural_center",
  "concert_bar",
  "venue",
  "gallery",
  "festival",
  "studio",
  "other",
];

const typeColors: Record<PlaceType, string> = {
  radio: "#F59E0B",
  cultural_center: "#7C3AED",
  concert_bar: "#EC4899",
  venue: "#10B981",
  gallery: "#F97316",
  festival: "#06B6D4",
  studio: "#8B5CF6",
  other: "#6B7280",
};

const typeLabelKeys: Record<PlaceType, string> = {
  radio: "type_radio",
  cultural_center: "type_cultural_center",
  concert_bar: "type_concert_bar",
  venue: "type_venue",
  gallery: "type_gallery",
  festival: "type_festival",
  studio: "type_studio",
  other: "type_other",
};

type PlacesDirectoryProps = {
  places: Place[];
};

function getCoordinate(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function getPopup(place: Place, typeLabel: string, visitLabel: string) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-2 p-1 font-sans text-sm text-zinc-950";

  const title = document.createElement("p");
  title.className = "font-semibold";
  title.textContent = place.name;
  wrapper.append(title);

  const meta = document.createElement("p");
  meta.className = "text-xs text-zinc-500";
  meta.textContent = [typeLabel, place.city].filter(Boolean).join(" · ");
  wrapper.append(meta);

  if (place.description) {
    const description = document.createElement("p");
    description.className = "text-xs leading-5 text-zinc-700";
    description.textContent = place.description;
    wrapper.append(description);
  }

  if (place.website) {
    const link = document.createElement("a");
    link.href = place.website;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "text-xs font-medium text-purple-700";
    link.textContent = visitLabel;
    wrapper.append(link);
  }

  return wrapper;
}

export function PlacesDirectory({ places }: PlacesDirectoryProps) {
  const t = useTranslations("places");
  const mapT = useTranslations("map");
  const { resolvedTheme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const activeMapStyle = useRef<string | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<PlaceType | "all">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const mapStyle = resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";

  const cities = useMemo(
    () => Array.from(new Set(places.map((place) => place.city).filter((city): city is string => Boolean(city)))).sort(),
    [places],
  );

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return places.filter((place) => {
      const matchesQuery = normalizedQuery
        ? [place.name, place.city, place.address, place.description]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedQuery))
        : true;
      const matchesType = typeFilter === "all" || place.type === typeFilter;
      const matchesCity = cityFilter === "all" || place.city === cityFilter;

      return matchesQuery && matchesType && matchesCity;
    });
  }, [cityFilter, places, query, typeFilter]);

  useEffect(() => {
    if (map.current || !mapContainer.current || !token) {
      return;
    }

    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      center: [4.3517, 50.8503],
      container: mapContainer.current,
      style: mapStyle,
      zoom: 7,
    });
    activeMapStyle.current = mapStyle;
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
      activeMapStyle.current = null;
    };
  }, [mapStyle, token]);

  useEffect(() => {
    if (!map.current || activeMapStyle.current === mapStyle) {
      return;
    }

    map.current.setStyle(mapStyle);
    activeMapStyle.current = mapStyle;
  }, [mapStyle]);

  useEffect(() => {
    if (!map.current) {
      return;
    }

    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    filteredPlaces.forEach((place) => {
      const latitude = getCoordinate(place.latitude);
      const longitude = getCoordinate(place.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.ariaLabel = place.name;
      markerElement.style.cssText = `
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${typeColors[place.type]};
        border: 2px solid white;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0,0,0,0.45);
      `;

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setDOMContent(getPopup(place, mapT(typeLabelKeys[place.type]), mapT("visit_website"))))
        .addTo(map.current as mapboxgl.Map);

      bounds.extend([longitude, latitude]);
      markers.current.push(marker);
    });

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { maxZoom: 11, padding: 64 });
    }
  }, [filteredPlaces, mapT]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-3 rounded-lg border border-purple-100 bg-card p-4 shadow-sm dark:border-zinc-800 md:grid-cols-[1fr_180px]">
          <label className="relative">
            <span className="sr-only">{t("search_label")}</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search_placeholder")}
              className="pl-9"
            />
          </label>
          <label>
            <span className="sr-only">{t("city_filter")}</span>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">{t("all_cities")}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                typeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary",
              )}
            >
              {t("all_types")}
            </button>
            {placeTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  typeFilter === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary",
                )}
              >
                {mapT(typeLabelKeys[type])}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm font-medium text-muted-foreground">{t("results_count", { count: filteredPlaces.length })}</p>

        {filteredPlaces.length > 0 ? (
          <div className="grid gap-3">
            {filteredPlaces.map((place) => (
              <article key={place.id} className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-normal">{place.name}</h2>
                      <Badge variant="secondary">{mapT(typeLabelKeys[place.type])}</Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPinIcon className="size-4" />
                      {[place.address, place.city].filter(Boolean).join(", ") || t("location_missing")}
                    </p>
                    {place.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{place.description}</p> : null}
                  </div>
                  {place.website ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={place.website} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon data-icon="inline-start" />
                        {t("visit")}
                      </a>
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">{t("empty")}</div>
        )}
      </section>

      <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
        {token ? (
          <div ref={mapContainer} className="h-[420px] overflow-hidden rounded-lg border border-purple-100 bg-purple-50 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:h-full" />
        ) : (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{mapT("missing_token")}</div>
        )}
      </aside>
    </div>
  );
}
