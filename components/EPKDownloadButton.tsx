"use client";

import { DownloadIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { generateEPKZip } from "@/lib/generateEPKZip";
import type { Performance, PressPhoto, Profile, TechRider } from "@/lib/types";

type EPKDownloadButtonProps = {
  profile: Profile;
  pressPhotos: PressPhoto[];
  performances?: Performance[];
  techRider: TechRider | null;
  labels?: {
    download: string;
    preparing: string;
    done: string;
  };
};

const defaultLabels = {
  download: "Télécharger l'EPK complet (ZIP)",
  preparing: "Préparation du ZIP...",
  done: "ZIP téléchargé !",
};

export function EPKDownloadButton({ profile, pressPhotos, performances = [], techRider, labels = defaultLabels }: EPKDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleDownload() {
    setLoading(true);

    try {
      await generateEPKZip(profile, pressPhotos, techRider, performances);
      setDone(true);
      window.setTimeout(() => setDone(false), 3000);
    } catch (error) {
      console.error("ZIP generation failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={() => void handleDownload()}
      disabled={loading}
      className={
        done
          ? "bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-700"
          : "bg-purple-600 text-white shadow-lg shadow-purple-900/30 hover:scale-105 hover:bg-purple-700"
      }
    >
      {loading ? (
        <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
      ) : (
        <DownloadIcon data-icon="inline-start" />
      )}
      {loading ? labels.preparing : done ? labels.done : labels.download}
    </Button>
  );
}
