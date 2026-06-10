"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { EyeIcon, FileTextIcon, LoaderCircleIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { PressPhoto, PressPhotoOrientation, PressQuote, Profile, TechRider } from "@/lib/types";
import { cn, generateSlug } from "@/lib/utils";

const orientations: PressPhotoOrientation[] = ["horizontal", "vertical", "logo"];
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const MAX_PDF_SIZE = 20 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_PDF_TYPES = ["application/pdf"];

const epkProfileSchema = z.object({
  bio_pitch: z.string().trim().max(150),
  bio_short: z.string().trim().max(500),
  bio_long: z.string().trim().max(2000),
  contact_email: z.string().trim().email().or(z.literal("")),
  press_quotes: z.array(
    z.object({
      quote: z.string().trim(),
      source: z.string().trim(),
      year: z.string().trim(),
    }),
  ),
});

type EPKEditorProps = {
  profile: Profile | null;
  userId: string;
  pressPhotos: PressPhoto[];
  techRider: TechRider | null;
};

function nullableText(value: string | null | undefined) {
  return value ?? "";
}

function cleanText(value: string) {
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function getQuotes(profile: Profile | null): PressQuote[] {
  return Array.isArray(profile?.press_quotes) ? profile.press_quotes : [];
}

function getEPKSlug(profile: Profile | null, userId: string) {
  return profile?.slug || `${generateSlug(profile?.stage_name || profile?.full_name, "artiste")}-${userId.slice(0, 8)}`;
}

function validatePressPhoto(file: File): string | null {
  if (file.size > MAX_PHOTO_SIZE) {
    return "Photo trop lourde (max 10MB)";
  }

  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return "Format non supporte (JPG, PNG, WebP)";
  }

  return null;
}

function validatePdfFile(file: File): string | null {
  if (file.size > MAX_PDF_SIZE) {
    return "PDF trop lourd (max 20MB)";
  }

  if (!ALLOWED_PDF_TYPES.includes(file.type)) {
    return "Format non supporte (PDF uniquement)";
  }

  return null;
}

export function EPKEditor({ profile, userId, pressPhotos, techRider }: EPKEditorProps) {
  const t = useTranslations("epk");
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const stagePlanInputRef = useRef<HTMLInputElement>(null);
  const patchListInputRef = useRef<HTMLInputElement>(null);
  const [bioPitch, setBioPitch] = useState(nullableText(profile?.bio_pitch));
  const [bioShort, setBioShort] = useState(nullableText(profile?.bio_short));
  const [bioLong, setBioLong] = useState(nullableText(profile?.bio_long));
  const [contactEmail, setContactEmail] = useState(nullableText(profile?.contact_email));
  const [quotes, setQuotes] = useState<PressQuote[]>(getQuotes(profile));
  const [photos, setPhotos] = useState(pressPhotos);
  const [rider, setRider] = useState(techRider);
  const [photoOrientation, setPhotoOrientation] = useState<PressPhotoOrientation>("horizontal");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoCredit, setPhotoCredit] = useState("");
  const [riderNotes, setRiderNotes] = useState(nullableText(techRider?.notes));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingRider, setIsUploadingRider] = useState(false);
  const epkSlug = getEPKSlug(profile, userId);

  async function saveEPK() {
    setError(null);
    setIsSaving(true);
    const parsed = epkProfileSchema.safeParse({
      bio_pitch: bioPitch,
      bio_short: bioShort,
      bio_long: bioLong,
      contact_email: contactEmail,
      press_quotes: quotes
        .map((quote) => ({
          quote: quote.quote.trim(),
          source: quote.source.trim(),
          year: quote.year.trim(),
        }))
        .filter((quote) => quote.quote || quote.source || quote.year),
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? t("save_error");
      setError(message);
      setIsSaving(false);
      return;
    }

    const supabase = createClient();
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: profile?.full_name || t("artist_fallback"),
      stage_name: profile?.stage_name,
      bio: profile?.bio,
      city: profile?.city,
      artistic_disciplines: profile?.artistic_disciplines ?? [],
      avatar_url: profile?.avatar_url,
      website_url: profile?.website_url,
      spotify_url: profile?.spotify_url,
      youtube_url: profile?.youtube_url,
      tiktok_url: profile?.tiktok_url,
      instagram_url: profile?.instagram_url,
      linktree_url: profile?.linktree_url,
      bio_pitch: cleanText(parsed.data.bio_pitch),
      bio_short: cleanText(parsed.data.bio_short),
      bio_long: cleanText(parsed.data.bio_long),
      contact_email: cleanText(parsed.data.contact_email),
      slug: epkSlug,
      press_quotes: parsed.data.press_quotes,
      is_member: profile?.is_member ?? false,
    });

    if (profileError) {
      setError(profileError.message);
      toast.error(profileError.message);
      setIsSaving(false);
      return;
    }

    if (riderNotes || rider) {
      const { data, error: riderError } = await supabase
        .from("tech_riders")
        .upsert({
          profile_id: userId,
          stage_plan_url: rider?.stage_plan_url ?? null,
          patch_list_url: rider?.patch_list_url ?? null,
          notes: cleanText(riderNotes),
        })
        .select("*")
        .single();

      if (riderError) {
        setError(riderError.message);
        toast.error(riderError.message);
        setIsSaving(false);
        return;
      }

      setRider(data);
    }

    toast.success(t("profile_saved"));
    setIsSaving(false);
    router.refresh();
  }

  async function uploadPressPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validatePressPhoto(file);

    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      event.target.value = "";
      return;
    }

    if (photos.length >= 4) {
      toast.error(t("photo_limit"));
      event.target.value = "";
      return;
    }

    setIsUploadingPhoto(true);
    setError(null);
    const supabase = createClient();
    const extension = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}-${photoOrientation}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("press-photos").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      setError(uploadError.message);
      toast.error(uploadError.message);
      setIsUploadingPhoto(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("press-photos").getPublicUrl(path);
    const { data, error: insertError } = await supabase
      .from("press_photos")
      .insert({
        profile_id: userId,
        url: publicData.publicUrl,
        filename: file.name,
        caption: cleanText(photoCaption),
        photographer: cleanText(photoCredit),
        orientation: photoOrientation,
        is_primary: photos.length === 0,
        sort_order: photos.length,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      toast.error(insertError.message);
      setIsUploadingPhoto(false);
      return;
    }

    setPhotos((current) => [...current, data]);
    setPhotoCaption("");
    setPhotoCredit("");
    event.target.value = "";
    toast.success(t("photo_uploaded"));
    setIsUploadingPhoto(false);
    router.refresh();
  }

  async function deletePressPhoto(photoId: string) {
    if (!window.confirm(t("confirm_delete_photo"))) {
      return;
    }

    const supabase = createClient();
    const { error: deleteError } = await supabase.from("press_photos").delete().eq("id", photoId);

    if (deleteError) {
      setError(deleteError.message);
      toast.error(deleteError.message);
      return;
    }

    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    toast.success(t("photo_deleted"));
    router.refresh();
  }

  async function uploadRiderPdf(kind: "stage_plan_url" | "patch_list_url", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validatePdfFile(file);

    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      event.target.value = "";
      return;
    }

    setIsUploadingRider(true);
    setError(null);
    const supabase = createClient();
    const path = `${userId}/${kind}.pdf`;
    const { error: uploadError } = await supabase.storage.from("tech-riders").upload(path, file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: true,
    });

    if (uploadError) {
      setError(uploadError.message);
      toast.error(uploadError.message);
      setIsUploadingRider(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("tech-riders").getPublicUrl(path);
    const nextRider = {
      profile_id: userId,
      stage_plan_url: kind === "stage_plan_url" ? publicData.publicUrl : rider?.stage_plan_url ?? null,
      patch_list_url: kind === "patch_list_url" ? publicData.publicUrl : rider?.patch_list_url ?? null,
      notes: cleanText(riderNotes),
    };
    const { data, error: riderError } = await supabase.from("tech_riders").upsert(nextRider).select("*").single();

    if (riderError) {
      setError(riderError.message);
      toast.error(riderError.message);
      setIsUploadingRider(false);
      return;
    }

    setRider(data);
    event.target.value = "";
    toast.success(t("rider_uploaded"));
    setIsUploadingRider(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-normal">{t("section_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("section_description")}</p>
        </div>
        <Button asChild variant="outline">
          <a href={`/epk/${epkSlug}`} target="_blank" rel="noreferrer">
            <EyeIcon data-icon="inline-start" />
            {t("view_epk")}
          </a>
        </Button>
      </div>

      <div className="grid gap-5">
        <CounterField
          label={t("bio_pitch_label")}
          value={bioPitch}
          max={150}
          rows={3}
          onChange={setBioPitch}
        />
        <CounterField
          label={t("bio_short_label")}
          value={bioShort}
          max={500}
          rows={5}
          onChange={setBioShort}
        />
        <CounterField
          label={t("bio_long_label")}
          value={bioLong}
          max={2000}
          rows={8}
          onChange={setBioLong}
        />
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("contact_label")}
          <Input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
        </label>

        <div className="rounded-lg border bg-background p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">{t("quotes_label")}</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuotes((current) => [...current, { quote: "", source: "", year: "" }])}
            >
              <PlusIcon data-icon="inline-start" />
              {t("add_quote")}
            </Button>
          </div>
          <div className="grid gap-3">
            {quotes.length > 0 ? (
              quotes.map((quote, index) => (
                <div key={index} className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-[1fr_0.7fr_0.35fr_auto]">
                  <Input
                    aria-label={t("quote_text")}
                    placeholder={t("quote_text")}
                    value={quote.quote}
                    onChange={(event) => updateQuote(index, "quote", event.target.value, setQuotes)}
                  />
                  <Input
                    aria-label={t("quote_source")}
                    placeholder={t("quote_source")}
                    value={quote.source}
                    onChange={(event) => updateQuote(index, "source", event.target.value, setQuotes)}
                  />
                  <Input
                    aria-label={t("quote_year")}
                    placeholder={t("quote_year")}
                    value={quote.year}
                    onChange={(event) => updateQuote(index, "year", event.target.value, setQuotes)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("remove_quote")}
                    onClick={() => setQuotes((current) => current.filter((_, quoteIndex) => quoteIndex !== index))}
                  >
                    <Trash2Icon data-icon="inline-start" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("quotes_empty")}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <h3 className="font-semibold">{t("photos_label")}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              {t("photo_orientation")}
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={photoOrientation}
                onChange={(event) => setPhotoOrientation(event.target.value as PressPhotoOrientation)}
              >
                {orientations.map((orientation) => (
                  <option key={orientation} value={orientation}>
                    {t(`orientation_${orientation}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              {t("photo_caption")}
              <Input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              {t("photo_credit")}
              <Input value={photoCredit} onChange={(event) => setPhotoCredit(event.target.value)} />
            </label>
          </div>
          <Input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadPressPhoto(event)} />
          <Button
            type="button"
            className="mt-4"
            variant="outline"
            disabled={isUploadingPhoto || photos.length >= 4}
            onClick={() => photoInputRef.current?.click()}
          >
            {isUploadingPhoto ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
            {t("upload_photo")}
          </Button>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {photos.map((photo) => (
              <div key={photo.id} className="rounded-md border bg-card p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption || t("press_photo_alt")} className="aspect-video w-full rounded-md object-cover" />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{photo.caption || photo.filename || t("press_photo")}</p>
                    <p>{photo.photographer}</p>
                    <p>{photo.orientation ? t(`orientation_${photo.orientation}`) : null}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => void deletePressPhoto(photo.id)}>
                    <Trash2Icon data-icon="inline-start" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <h3 className="font-semibold">{t("rider_label")}</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Input
              ref={stagePlanInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => void uploadRiderPdf("stage_plan_url", event)}
            />
            <Input
              ref={patchListInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => void uploadRiderPdf("patch_list_url", event)}
            />
            <Button type="button" variant="outline" disabled={isUploadingRider} onClick={() => stagePlanInputRef.current?.click()}>
              <FileTextIcon data-icon="inline-start" />
              {rider?.stage_plan_url ? t("replace_stage_plan") : t("upload_stage_plan")}
            </Button>
            <Button type="button" variant="outline" disabled={isUploadingRider} onClick={() => patchListInputRef.current?.click()}>
              <FileTextIcon data-icon="inline-start" />
              {rider?.patch_list_url ? t("replace_patch_list") : t("upload_patch_list")}
            </Button>
          </div>
          <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
            {t("rider_notes")}
            <Textarea rows={5} value={riderNotes} onChange={(event) => setRiderNotes(event.target.value)} />
          </label>
        </div>

        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p> : null}

        <Button type="button" onClick={() => void saveEPK()} disabled={isSaving} className="w-fit">
          {isSaving ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}
          {t("save_epk")}
        </Button>
      </div>
    </section>
  );
}

function CounterField({
  label,
  max,
  onChange,
  rows,
  value,
}: Readonly<{
  label: string;
  max: number;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <Textarea rows={rows} maxLength={max} value={value} onChange={(event) => onChange(event.target.value)} />
      <span className={cn("text-right text-xs font-normal", value.length > max ? "text-destructive" : "text-muted-foreground")}>
        {value.length}/{max}
      </span>
    </label>
  );
}

function updateQuote(
  index: number,
  field: keyof PressQuote,
  value: string,
  setQuotes: (updater: (current: PressQuote[]) => PressQuote[]) => void,
) {
  setQuotes((current) =>
    current.map((quote, quoteIndex) => (quoteIndex === index ? { ...quote, [field]: value } : quote)),
  );
}
