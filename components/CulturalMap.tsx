"use client";

import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { Place, PlaceType } from "@/lib/types";

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

type CulturalMapProps = {
  places: Place[];
};

function getCoordinate(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function createPopupContent(place: Place, typeLabel: string, visitLabel: string) {
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

export function CulturalMap({ places }: CulturalMapProps) {
  const t = useTranslations("map");
  const { resolvedTheme } = useTheme();
  const mapStyle =
    resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const initialMapStyle = useRef(mapStyle);
  const activeMapStyle = useRef<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PlaceType | "all">("all");
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (map.current || !mapContainer.current || !token) {
      return;
    }

    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: initialMapStyle.current,
      center: [4.3517, 50.8503],
      zoom: 7,
    });
    activeMapStyle.current = initialMapStyle.current;

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
      activeMapStyle.current = null;
    };
  }, [token]);

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

    const visiblePlaces = activeFilter === "all" ? places : places.filter((place) => place.type === activeFilter);

    visiblePlaces.forEach((place) => {
      const latitude = getCoordinate(place.latitude);
      const longitude = getCoordinate(place.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = "cultural-marker";
      markerElement.ariaLabel = place.name;
      markerElement.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${typeColors[place.type] ?? typeColors.other};
        border: 2px solid white;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0,0,0,0.5);
      `;

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([longitude, latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 20 }).setDOMContent(
            createPopupContent(place, t(typeLabelKeys[place.type]), t("visit_website")),
          ),
        )
        .addTo(map.current as mapboxgl.Map);

      markers.current.push(marker);
    });
  }, [activeFilter, places, t]);

  if (!token) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        {t("missing_token")}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={
            activeFilter === "all"
              ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
              : "rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary"
          }
        >
          {t("type_all")}
        </button>
        {placeTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveFilter(type)}
            className={
              activeFilter === type
                ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                : "rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary"
            }
          >
            {t(typeLabelKeys[type])}
          </button>
        ))}
      </div>

      <div
        ref={mapContainer}
        className="h-[480px] w-full overflow-hidden rounded-lg border border-purple-100 bg-purple-50 dark:border-zinc-800 dark:bg-zinc-950"
      />

      <div className="mt-3 flex flex-wrap gap-3">
        {placeTypes.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-full border border-white"
              style={{ background: typeColors[type] }}
            />
            <span className="text-xs text-muted-foreground">{t(typeLabelKeys[type])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
