import { saveAs } from "file-saver";
import JSZip from "jszip";

import type { Performance, PressPhoto, Profile, TechRider } from "@/lib/types";

function getArtistName(profile: Pick<Profile, "stage_name" | "full_name">) {
  return (profile.stage_name || profile.full_name || "Artiste").replace(/\s+/g, "_");
}

async function fetchBlob(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}`);
  }

  return response.blob();
}

function getFileExtension(url: string) {
  return url.split(".").pop()?.split("?")[0] || "jpg";
}

function getPhotoFilename(photo: PressPhoto, index: number, artistName: string) {
  const extension = getFileExtension(photo.url);
  let filename = `Photo${index + 1}_HD.${extension}`;

  if (photo.orientation === "horizontal") {
    filename = `Photo${index + 1}_Horizontal_HD.${extension}`;
  }

  if (photo.orientation === "vertical") {
    filename = `Photo${index + 1}_Vertical_HD.${extension}`;
  }

  if (photo.orientation === "logo") {
    filename = `Logo_${artistName}_Transparent.${extension === "jpg" ? "png" : extension}`;
  }

  if (photo.photographer) {
    filename = filename.replace(`.${extension}`, `_Credit_${photo.photographer.replace(/\s+/g, "_")}.${extension}`);
  }

  return filename;
}

function formatStat(value: number | null) {
  return value && value > 0 ? new Intl.NumberFormat("fr-BE").format(value) : "-";
}

function formatFeeRange(profile: Profile) {
  if (!profile.fee_min && !profile.fee_max) {
    return "-";
  }

  const currency = profile.fee_currency || "EUR";
  const formatter = new Intl.NumberFormat("fr-BE", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  });

  if (profile.fee_min && profile.fee_max) {
    return `${formatter.format(profile.fee_min)} - ${formatter.format(profile.fee_max)} / prestation`;
  }

  if (profile.fee_min) {
    return `${formatter.format(profile.fee_min)}+ / prestation`;
  }

  return `<= ${formatter.format(profile.fee_max ?? 0)} / prestation`;
}

export async function generateEPKZip(
  profile: Profile,
  pressPhotos: PressPhoto[],
  techRider: TechRider | null,
  performances: Performance[] = [],
) {
  const zip = new JSZip();
  const artistName = getArtistName(profile);
  const folder = zip.folder(`EPK_${artistName}`);

  const bioContent = [
    "=".repeat(50),
    `EPK - ${profile.stage_name || profile.full_name || "Artiste"}`,
    "=".repeat(50),
    "",
    `DISCIPLINES: ${profile.artistic_disciplines?.join(", ") || "-"}`,
    `VILLE: ${profile.city || "-"}, Belgique`,
    "",
    "-".repeat(50),
    "BIO COURTE (2 lignes)",
    "-".repeat(50),
    profile.bio_pitch || "-",
    "",
    "-".repeat(50),
    "BIO STANDARD",
    "-".repeat(50),
    profile.bio_short || profile.bio || "-",
    "",
    "-".repeat(50),
    "BIO COMPLETE",
    "-".repeat(50),
    profile.bio_long || profile.bio || "-",
    "",
    "-".repeat(50),
    "STATS",
    "-".repeat(50),
    `Auditeurs Spotify/mois: ${formatStat(profile.monthly_listeners)}`,
    `Abonnes Spotify:        ${formatStat(profile.spotify_followers)}`,
    `Abonnes YouTube:        ${formatStat(profile.youtube_subscribers)}`,
    `Abonnes Instagram:      ${formatStat(profile.instagram_followers)}`,
    `Abonnes TikTok:         ${formatStat(profile.tiktok_followers)}`,
    `TARIF INDICATIF:        ${formatFeeRange(profile)}`,
    "",
    "-".repeat(50),
    "EXPERIENCES SCENIQUES",
    "-".repeat(50),
    ...(performances.length > 0
      ? performances.map((performance) => {
          const year = new Date(`${performance.performance_date}T00:00:00`).getFullYear();
          return `- ${performance.event_name} ${year}${performance.audience_size ? ` (${performance.audience_size})` : ""}`;
        })
      : ["-"]),
    "",
    "-".repeat(50),
    "LIENS",
    "-".repeat(50),
    `Spotify:   ${profile.spotify_url || "-"}`,
    `YouTube:   ${profile.youtube_url || "-"}`,
    `Instagram: ${profile.instagram_url || "-"}`,
    `TikTok:    ${profile.tiktok_url || "-"}`,
    `Site web:  ${profile.website_url || "-"}`,
    "",
    "-".repeat(50),
    "CONTACT & BOOKING",
    "-".repeat(50),
    profile.contact_email || "-",
    "",
    "-".repeat(50),
    "Genere via PaxKonnect - paxkonnect.be",
    `© ${new Date().getFullYear()} MonsPax ASBL`,
  ].join("\n");

  folder?.file(`Biographie_${artistName}.txt`, bioContent);

  if (pressPhotos.length > 0) {
    const photosFolder = folder?.folder("Photos_Presse");

    for (let index = 0; index < pressPhotos.length; index += 1) {
      const photo = pressPhotos[index];

      try {
        const blob = await fetchBlob(photo.url);
        photosFolder?.file(getPhotoFilename(photo, index, artistName), blob);
      } catch (error) {
        console.error("Failed to fetch photo:", photo.url, error);
      }
    }
  }

  if (techRider) {
    const techFolder = folder?.folder("Technique");
    const year = new Date().getFullYear();

    if (techRider.stage_plan_url) {
      try {
        const blob = await fetchBlob(techRider.stage_plan_url);
        techFolder?.file(`Plan_de_Scene_${artistName}_${year}.pdf`, blob);
      } catch (error) {
        console.error("Failed to fetch stage plan", error);
      }
    }

    if (techRider.patch_list_url) {
      try {
        const blob = await fetchBlob(techRider.patch_list_url);
        techFolder?.file(`Fiche_Technique_${artistName}_${year}.pdf`, blob);
      } catch (error) {
        console.error("Failed to fetch patch list", error);
      }
    }

    if (techRider.notes) {
      techFolder?.file("Notes_Techniques.txt", techRider.notes);
    }
  }

  const content = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  saveAs(content, `EPK_${artistName}_PaxKonnect.zip`);
}
