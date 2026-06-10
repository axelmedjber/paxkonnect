"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ExternalLinkIcon,
  GlobeIcon,
  InstagramIcon,
  LinkIcon,
  LoaderCircleIcon,
  MusicIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  VideoIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, type ComponentType, type ReactNode, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { refreshSpotifyData } from "@/app/actions/spotify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Performance, PortfolioItem, Profile, SpotifyDataPublic } from "@/lib/types";
import { cn, generateSlug, getInitials } from "@/lib/utils";

const disciplines = ["music", "visual arts", "theatre", "dance", "literature", "film", "other"] as const;
const portfolioTypes = ["music", "video", "photo", "text", "other"] as const;
const performanceAudienceSizes = ["< 50", "50-200", "200-500", "500-1000", "1000-5000", "5000+"] as const;
const performanceEventTypes = ["concert", "festival", "showcase", "residency", "private", "radio", "podcast", "other"] as const;
const disciplineLabelKeys: Record<(typeof disciplines)[number], string> = {
  music: "discipline_music",
  "visual arts": "discipline_visual_arts",
  theatre: "discipline_theatre",
  dance: "discipline_dance",
  literature: "discipline_literature",
  film: "discipline_film",
  other: "discipline_other",
};
const portfolioTypeLabelKeys: Record<(typeof portfolioTypes)[number], string> = {
  music: "portfolio_type_music",
  video: "portfolio_type_video",
  photo: "portfolio_type_photo",
  text: "portfolio_type_text",
  other: "portfolio_type_other",
};

const createOptionalUrl = (invalidUrlMessage: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/.+\..+/.test(value), {
      message: invalidUrlMessage,
    })
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null));

const maxBioLength = 500;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const optionalNumberSchema = z
  .union([z.literal(""), z.coerce.number().int().min(0)])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

function validateAvatarFile(file: File): string | null {
  if (file.size > MAX_AVATAR_SIZE) {
    return "Image trop lourde (max 5MB)";
  }

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return "Format non supporte (JPG, PNG, WebP, GIF)";
  }

  return null;
}

const createProfileSchema = (messages: { fullNameRequired: string; invalidUrl: string; bioMax: string }) => {
  const optionalUrl = createOptionalUrl(messages.invalidUrl);

  return z.object({
    full_name: z.string().trim().min(1, messages.fullNameRequired),
    stage_name: z.string().trim().nullable(),
    bio: z.string().trim().max(maxBioLength, messages.bioMax).nullable(),
    city: z.string().trim().nullable(),
    artistic_disciplines: z.array(z.enum(disciplines)),
    spotify_url: optionalUrl,
    youtube_url: optionalUrl,
    tiktok_url: optionalUrl,
    instagram_url: optionalUrl,
    website_url: optionalUrl,
    linktree_url: optionalUrl,
    monthly_listeners: optionalNumberSchema,
    spotify_followers: optionalNumberSchema,
    youtube_subscribers: optionalNumberSchema,
    instagram_followers: optionalNumberSchema,
    tiktok_followers: optionalNumberSchema,
    fee_min: optionalNumberSchema,
    fee_max: optionalNumberSchema,
  });
};

const createPortfolioSchema = (messages: { titleRequired: string; invalidUrl: string }) => {
  const optionalUrl = createOptionalUrl(messages.invalidUrl);

  return z.object({
    title: z.string().trim().min(1, messages.titleRequired),
    type: z.enum(portfolioTypes),
    url: optionalUrl,
    description: z.string().trim().nullable(),
  });
};

type ProfileSchema = ReturnType<typeof createProfileSchema>;
type PortfolioSchema = ReturnType<typeof createPortfolioSchema>;
type ProfileValues = z.output<ProfileSchema>;
type ProfileInputValues = z.input<ProfileSchema>;
type PortfolioValues = z.output<PortfolioSchema>;
type PortfolioInputValues = z.input<PortfolioSchema>;
const performanceSchema = z.object({
  audience_size: z.enum(performanceAudienceSizes).or(z.literal("")).transform((value) => value || null),
  city: z.string().trim().min(1),
  description: z.string().trim().max(200).or(z.literal("")).transform((value) => value || null),
  event_name: z.string().trim().min(1),
  event_type: z.enum(performanceEventTypes).or(z.literal("")).transform((value) => value || null),
  media_url: createOptionalUrl("Invalid URL"),
  performance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue_name: z.string().trim().or(z.literal("")).transform((value) => value || null),
});
type PerformanceValues = z.output<typeof performanceSchema>;
type PerformanceInputValues = z.input<typeof performanceSchema>;

type ProfileEditFormProps = {
  mode?: "portfolio" | "profile";
  locale: string;
  performances: Performance[];
  profile: Profile | null;
  portfolioItems: PortfolioItem[];
  spotifyData?: SpotifyDataPublic | null;
  userId: string;
};

function nullableText(value: string | null | undefined) {
  return value ?? "";
}

function cleanText(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function nullableNumberInput(value: number | null | undefined) {
  return value ?? "";
}

function getProfileSlug(profile: Profile | null, userId: string, stageName: string | null | undefined, fullName: string | null | undefined) {
  return profile?.slug || `${generateSlug(stageName || fullName, "artiste")}-${userId.slice(0, 8)}`;
}

function isDiscipline(value: string): value is (typeof disciplines)[number] {
  return disciplines.some((discipline) => discipline === value);
}

function isPortfolioType(value: string): value is (typeof portfolioTypes)[number] {
  return portfolioTypes.some((type) => type === value);
}

export function ProfileEditForm({ locale, mode = "profile", performances, profile, portfolioItems, spotifyData, userId }: ProfileEditFormProps) {
  const t = useTranslations("profile_edit");
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [items, setItems] = useState(portfolioItems);
  const [performanceItems, setPerformanceItems] = useState(performances);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSavedMessage, setProfileSavedMessage] = useState<string | null>(null);
  const [isSyncingSpotify, setIsSyncingSpotify] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const displayName = profileFormDisplayName(profile);
  const profileSchema = createProfileSchema({
    fullNameRequired: t("full_name_required"),
    invalidUrl: t("invalid_url"),
    bioMax: t("bio_max_error", { max: maxBioLength }),
  });
  const portfolioSchema = createPortfolioSchema({
    titleRequired: t("portfolio_title_required"),
    invalidUrl: t("invalid_url"),
  });

  const profileForm = useForm<ProfileInputValues, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: nullableText(profile?.full_name),
      stage_name: nullableText(profile?.stage_name),
      bio: nullableText(profile?.bio),
      city: nullableText(profile?.city),
      artistic_disciplines: (profile?.artistic_disciplines ?? []).filter(isDiscipline),
      spotify_url: nullableText(profile?.spotify_url),
      youtube_url: nullableText(profile?.youtube_url),
      tiktok_url: nullableText(profile?.tiktok_url),
      instagram_url: nullableText(profile?.instagram_url),
      website_url: nullableText(profile?.website_url),
      linktree_url: nullableText(profile?.linktree_url),
      monthly_listeners: nullableNumberInput(profile?.monthly_listeners),
      spotify_followers: nullableNumberInput(profile?.spotify_followers),
      youtube_subscribers: nullableNumberInput(profile?.youtube_subscribers),
      instagram_followers: nullableNumberInput(profile?.instagram_followers),
      tiktok_followers: nullableNumberInput(profile?.tiktok_followers),
      fee_min: nullableNumberInput(profile?.fee_min),
      fee_max: nullableNumberInput(profile?.fee_max),
    },
  });

  const portfolioForm = useForm<PortfolioInputValues, unknown, PortfolioValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      title: "",
      type: "music",
      url: "",
      description: "",
    },
  });
  const performanceForm = useForm<PerformanceInputValues, unknown, PerformanceValues>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      audience_size: "",
      city: "",
      description: "",
      event_name: "",
      event_type: "concert",
      media_url: "",
      performance_date: "",
      venue_name: "",
    },
  });
  const bioValue = useWatch({ control: profileForm.control, name: "bio" }) ?? "";
  const watchedStageName = useWatch({ control: profileForm.control, name: "stage_name" });
  const watchedFullName = useWatch({ control: profileForm.control, name: "full_name" });
  const currentDisplayName =
    watchedStageName || watchedFullName || displayName;

  async function uploadAvatar(file: File) {
    const validationError = validateAvatarFile(file);

    if (validationError) {
      setProfileError(validationError);
      toast.error(validationError);
      return;
    }

    setIsUploadingAvatar(true);
    setProfileError(null);
    const supabase = createClient();
    const filePath = `${userId}/avatar`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      setIsUploadingAvatar(false);
      setProfileError(error.message);
      toast.error(error.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: profileForm.getValues("full_name") || profile?.full_name || t("artist_fallback"),
        stage_name: cleanText(profileForm.getValues("stage_name")),
        bio: cleanText(profileForm.getValues("bio")),
        city: cleanText(profileForm.getValues("city")),
        artistic_disciplines: profileForm.getValues("artistic_disciplines"),
        avatar_url: data.publicUrl,
        website_url: profileForm.getValues("website_url") || null,
        spotify_url: profileForm.getValues("spotify_url") || null,
        youtube_url: profileForm.getValues("youtube_url") || null,
        tiktok_url: profileForm.getValues("tiktok_url") || null,
        instagram_url: profileForm.getValues("instagram_url") || null,
        linktree_url: profileForm.getValues("linktree_url") || null,
        monthly_listeners: profile?.monthly_listeners ?? null,
        spotify_followers: profile?.spotify_followers ?? null,
        youtube_subscribers: profile?.youtube_subscribers ?? null,
        instagram_followers: profile?.instagram_followers ?? null,
        tiktok_followers: profile?.tiktok_followers ?? null,
        stats_updated_at: profile?.stats_updated_at ?? null,
        fee_min: profile?.fee_min ?? null,
        fee_max: profile?.fee_max ?? null,
        fee_currency: profile?.fee_currency ?? "EUR",
        slug: getProfileSlug(profile, userId, profileForm.getValues("stage_name"), profileForm.getValues("full_name")),
        is_member: profile?.is_member ?? false,
      });

    if (profileError) {
      setIsUploadingAvatar(false);
      setProfileError(profileError.message);
      toast.error(profileError.message);
      return;
    }

    setAvatarUrl(data.publicUrl);
    setIsUploadingAvatar(false);
    toast.success(t("avatar_uploaded"));
    router.refresh();
  }

  async function saveProfile(values: ProfileValues) {
    setProfileSavedMessage(null);
    setProfileError(null);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: values.full_name,
      stage_name: cleanText(values.stage_name),
      bio: cleanText(values.bio),
      city: cleanText(values.city),
      artistic_disciplines: values.artistic_disciplines,
      avatar_url: avatarUrl,
      website_url: values.website_url,
      spotify_url: values.spotify_url,
      youtube_url: values.youtube_url,
      tiktok_url: values.tiktok_url,
      instagram_url: values.instagram_url,
      linktree_url: values.linktree_url,
      monthly_listeners: values.monthly_listeners,
      spotify_followers: values.spotify_followers,
      youtube_subscribers: values.youtube_subscribers,
      instagram_followers: values.instagram_followers,
      tiktok_followers: values.tiktok_followers,
      stats_updated_at: new Date().toISOString(),
      fee_min: values.fee_min,
      fee_max: values.fee_max,
      fee_currency: "EUR",
      slug: getProfileSlug(profile, userId, values.stage_name, values.full_name),
      is_member: profile?.is_member ?? false,
    });

    if (error) {
      setProfileError(error.message);
      toast.error(error.message);
      return;
    }

    toast.success(t("profile_saved_message"));
    setProfileSavedMessage(t("profile_saved_message"));
    router.refresh();
  }

  async function addPortfolioItem(values: PortfolioValues) {
    setPortfolioError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("portfolio_items")
      .insert({
        profile_id: userId,
        title: values.title,
        type: values.type,
        url: values.url,
        description: cleanText(values.description),
      })
      .select("*")
      .single();

    if (error) {
      setPortfolioError(error.message);
      return;
    }

    if (data) {
      setItems((currentItems) => [data, ...currentItems]);
      portfolioForm.reset({
        title: "",
        type: "music",
        url: "",
        description: "",
      });
      toast.success(t("portfolio_added"));
      router.refresh();
    }
  }

  async function deletePortfolioItem(itemId: string) {
    const item = items.find((currentItem) => currentItem.id === itemId);

    if (!window.confirm(t("portfolio_delete_confirm", { title: item?.title ?? "" }))) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("portfolio_items").delete().eq("id", itemId);

    if (error) {
      toast.error(error.message);
      setPortfolioError(error.message);
      return;
    }

    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    toast.success(t("portfolio_deleted"));
    router.refresh();
  }

  async function addPerformance(values: PerformanceValues) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("performances")
      .insert({
        audience_size: values.audience_size,
        city: values.city,
        country: "BE",
        description: values.description,
        event_name: values.event_name,
        event_type: values.event_type,
        is_public: true,
        media_url: values.media_url,
        performance_date: values.performance_date,
        profile_id: userId,
        venue_name: values.venue_name,
      })
      .select("*")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data) {
      setPerformanceItems((currentItems) => [data, ...currentItems]);
      performanceForm.reset({
        audience_size: "",
        city: "",
        description: "",
        event_name: "",
        event_type: "concert",
        media_url: "",
        performance_date: "",
        venue_name: "",
      });
      toast.success(t("performances_added"));
      router.refresh();
    }
  }

  async function deletePerformance(itemId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("performances").delete().eq("id", itemId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPerformanceItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    toast.success(t("performances_deleted"));
    router.refresh();
  }

  async function syncSpotify() {
    setIsSyncingSpotify(true);
    setSpotifyError(null);
    const result = await refreshSpotifyData(locale);
    setIsSyncingSpotify(false);

    if (!result.success) {
      setSpotifyError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success(t("spotify_sync_success"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-6" onSubmit={profileForm.handleSubmit(saveProfile)} noValidate>
        <section className={cn("rounded-lg border bg-card p-5", mode !== "profile" && "hidden")}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-normal">{t("avatar")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("avatar_description")}</p>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <button
              type="button"
              className="group relative flex size-40 items-center justify-center overflow-hidden rounded-lg border bg-muted"
              disabled={isUploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={t("avatar_alt")} className="size-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-muted-foreground">
                  {getInitials(currentDisplayName)}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {isUploadingAvatar ? (
                  <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <UploadIcon data-icon="inline-start" />
                )}
                {t("upload_avatar")}
              </span>
            </button>
            <div className="flex flex-col gap-3">
              <Input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadAvatar(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
                {isUploadingAvatar ? (
                  <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <UploadIcon data-icon="inline-start" />
                )}
                {t("upload_avatar")}
              </Button>
              <p className="max-w-md text-sm text-muted-foreground">{t("avatar_storage_note")}</p>
            </div>
          </div>
        </section>

        <section className={cn("rounded-lg border bg-card p-5", mode !== "profile" && "hidden")}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-normal">{t("artist_profile")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("artist_profile_description")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("full_name")} error={profileForm.formState.errors.full_name?.message}>
              <Input {...profileForm.register("full_name")} aria-invalid={Boolean(profileForm.formState.errors.full_name)} />
            </FormField>
            <FormField label={t("stage_name")} error={profileForm.formState.errors.stage_name?.message}>
              <Input {...profileForm.register("stage_name")} />
            </FormField>
            <FormField label={t("city")} error={profileForm.formState.errors.city?.message}>
              <Input {...profileForm.register("city")} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label={t("bio")} error={profileForm.formState.errors.bio?.message}>
                <Textarea rows={5} maxLength={maxBioLength} {...profileForm.register("bio")} />
                <span className="text-right text-xs font-normal text-muted-foreground">
                  {t("bio_counter", { count: bioValue.length, max: maxBioLength })}
                </span>
              </FormField>
            </div>
          </div>
        </section>

        <section className={cn("rounded-lg border bg-card p-5", mode !== "profile" && "hidden")}>
          <h2 className="mb-4 text-xl font-semibold tracking-normal">{t("disciplines")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {disciplines.map((discipline) => (
              <label
                key={discipline}
                className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  value={discipline}
                  className="size-4 accent-primary"
                  {...profileForm.register("artistic_disciplines")}
                />
                {t(disciplineLabelKeys[discipline])}
              </label>
            ))}
          </div>
        </section>

        <section className={cn("rounded-lg border bg-card p-5", mode !== "profile" && "hidden")}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-normal">{t("fee_title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("fee_helper")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField label={t("fee_min_label")} error={profileForm.formState.errors.fee_min?.message}>
              <Input type="number" min="0" step="50" placeholder={t("fee_min_placeholder")} {...profileForm.register("fee_min")} />
            </FormField>
            <span className="hidden pb-3 text-muted-foreground sm:block">—</span>
            <FormField label={t("fee_max_label")} error={profileForm.formState.errors.fee_max?.message}>
              <Input type="number" min="0" step="50" placeholder={t("fee_max_placeholder")} {...profileForm.register("fee_max")} />
            </FormField>
            <span className="pb-3 font-semibold">€</span>
          </div>
        </section>

        <section className={cn("rounded-lg border bg-card p-5", mode !== "portfolio" && "hidden")}>
          <SpotifyConnectSection
            connected={Boolean(spotifyData)}
            error={spotifyError}
            followers={profile?.spotify_followers ?? null}
            isSyncing={isSyncingSpotify}
            onSync={() => void syncSpotify()}
            topTracks={spotifyData?.top_tracks ?? []}
          />
          <h2 className="mb-4 text-xl font-semibold tracking-normal">{t("social_links")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("spotify")} error={profileForm.formState.errors.spotify_url?.message}>
              <IconInput icon={MusicIcon} type="url" placeholder="https://open.spotify.com/artist/..." {...profileForm.register("spotify_url")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("stats_monthly_listeners")} error={profileForm.formState.errors.monthly_listeners?.message}>
                <Input type="number" min="0" placeholder={t("stats_placeholder")} {...profileForm.register("monthly_listeners")} />
                <span className="text-xs font-normal text-muted-foreground">{t("stats_helper")}</span>
              </FormField>
              <FormField label={t("stats_spotify_followers")} error={profileForm.formState.errors.spotify_followers?.message}>
                <Input type="number" min="0" placeholder={t("stats_placeholder")} {...profileForm.register("spotify_followers")} />
                <span className="text-xs font-normal text-muted-foreground">{t("stats_helper")}</span>
              </FormField>
            </div>
            <FormField label={t("youtube")} error={profileForm.formState.errors.youtube_url?.message}>
              <IconInput icon={VideoIcon} type="url" placeholder="https://youtube.com/..." {...profileForm.register("youtube_url")} />
            </FormField>
            <FormField label={t("stats_youtube_subscribers")} error={profileForm.formState.errors.youtube_subscribers?.message}>
              <Input type="number" min="0" placeholder={t("stats_placeholder")} {...profileForm.register("youtube_subscribers")} />
              <span className="text-xs font-normal text-muted-foreground">{t("stats_helper")}</span>
            </FormField>
            <FormField label={t("tiktok")} error={profileForm.formState.errors.tiktok_url?.message}>
              <IconInput icon={MusicIcon} type="url" placeholder="https://www.tiktok.com/@..." {...profileForm.register("tiktok_url")} />
            </FormField>
            <FormField label={t("stats_tiktok_followers")} error={profileForm.formState.errors.tiktok_followers?.message}>
              <Input type="number" min="0" placeholder={t("stats_placeholder")} {...profileForm.register("tiktok_followers")} />
              <span className="text-xs font-normal text-muted-foreground">{t("stats_helper")}</span>
            </FormField>
            <FormField label={t("instagram")} error={profileForm.formState.errors.instagram_url?.message}>
              <IconInput icon={InstagramIcon} type="url" placeholder="https://www.instagram.com/..." {...profileForm.register("instagram_url")} />
            </FormField>
            <FormField label={t("stats_instagram_followers")} error={profileForm.formState.errors.instagram_followers?.message}>
              <Input type="number" min="0" placeholder={t("stats_placeholder")} {...profileForm.register("instagram_followers")} />
              <span className="text-xs font-normal text-muted-foreground">{t("stats_helper")}</span>
            </FormField>
            <FormField label={t("website")} error={profileForm.formState.errors.website_url?.message}>
              <IconInput icon={GlobeIcon} type="url" placeholder="https://www.monsite.be" {...profileForm.register("website_url")} />
            </FormField>
            <FormField label={t("linktree")} error={profileForm.formState.errors.linktree_url?.message}>
              <IconInput icon={LinkIcon} type="url" placeholder="https://linktr.ee/..." {...profileForm.register("linktree_url")} />
            </FormField>
          </div>
        </section>

        {profileSavedMessage ? (
          <div className="rounded-lg border bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
            {profileSavedMessage}
          </div>
        ) : null}

        {profileError ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{profileError}</p> : null}

        <SaveButton
          disabled={profileForm.formState.isSubmitting || isUploadingAvatar}
          isSubmitting={profileForm.formState.isSubmitting}
          label={t("save_profile")}
        />
      </form>

      <section className={cn("rounded-lg border bg-card p-5", mode !== "portfolio" && "hidden")}>
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-normal">{t("portfolio")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("portfolio_description")}</p>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={portfolioForm.handleSubmit(addPortfolioItem)} noValidate>
          <FormField label={t("portfolio_title")} error={portfolioForm.formState.errors.title?.message}>
            <Input {...portfolioForm.register("title")} />
          </FormField>
          <FormField label={t("portfolio_type")} error={portfolioForm.formState.errors.type?.message}>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...portfolioForm.register("type")}
            >
              {portfolioTypes.map((type) => (
                <option key={type} value={type}>
                  {t(portfolioTypeLabelKeys[type])}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("portfolio_url")} error={portfolioForm.formState.errors.url?.message}>
            <Input type="url" {...portfolioForm.register("url")} />
          </FormField>
          <div className="md:row-span-2">
            <FormField label={t("portfolio_description_label")} error={portfolioForm.formState.errors.description?.message}>
              <Textarea rows={5} {...portfolioForm.register("description")} />
            </FormField>
          </div>
          {portfolioError ? <p className="text-sm text-destructive md:col-span-2">{portfolioError}</p> : null}
          <Button type="submit" disabled={portfolioForm.formState.isSubmitting} className="md:w-fit">
            {portfolioForm.formState.isSubmitting ? (
              <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            {t("portfolio_add")}
          </Button>
        </form>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {items.length > 0 ? (
            items.map((item) => (
              <div key={item.id} className="rounded-md border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <span className="mt-2 inline-flex rounded-md bg-secondary px-2 py-1 text-xs font-medium uppercase text-secondary-foreground">
                      {isPortfolioType(item.type) ? t(portfolioTypeLabelKeys[item.type]) : item.type}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("delete_item", { title: item.title })}
                    onClick={() => void deletePortfolioItem(item.id)}
                  >
                    <Trash2Icon data-icon="inline-start" />
                  </Button>
                </div>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 break-all text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLinkIcon data-icon="inline-start" />
                    {item.url}
                  </a>
                ) : null}
                {item.description ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-md border bg-background p-4 text-sm text-muted-foreground md:col-span-2">
              {t("portfolio_empty")}
            </p>
          )}
        </div>
      </section>

      <section className={cn("rounded-lg border bg-card p-5", mode !== "portfolio" && "hidden")}>
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-normal">{t("performances_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("performances_description")}</p>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={performanceForm.handleSubmit(addPerformance)} noValidate>
          <FormField label={t("performances_event_name")} error={performanceForm.formState.errors.event_name?.message}>
            <Input {...performanceForm.register("event_name")} />
          </FormField>
          <FormField label={t("performances_venue")} error={performanceForm.formState.errors.venue_name?.message}>
            <Input {...performanceForm.register("venue_name")} />
          </FormField>
          <FormField label={t("city")} error={performanceForm.formState.errors.city?.message}>
            <Input {...performanceForm.register("city")} />
          </FormField>
          <FormField label={t("performances_date")} error={performanceForm.formState.errors.performance_date?.message}>
            <Input type="date" {...performanceForm.register("performance_date")} />
          </FormField>
          <FormField label={t("performances_event_type")} error={performanceForm.formState.errors.event_type?.message}>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" {...performanceForm.register("event_type")}>
              {performanceEventTypes.map((type) => (
                <option key={type} value={type}>{t(`event_type_${type}`)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t("performances_audience_size")} error={performanceForm.formState.errors.audience_size?.message}>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" {...performanceForm.register("audience_size")}>
              <option value="">{t("performances_audience_unknown")}</option>
              {performanceAudienceSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label={t("performances_description_label")} error={performanceForm.formState.errors.description?.message}>
              <Textarea rows={3} maxLength={200} {...performanceForm.register("description")} />
            </FormField>
          </div>
          <FormField label={t("performances_media_url")} error={performanceForm.formState.errors.media_url?.message}>
            <Input type="url" {...performanceForm.register("media_url")} />
          </FormField>
          <div className="flex items-end">
            <Button type="submit" disabled={performanceForm.formState.isSubmitting}>
              <PlusIcon data-icon="inline-start" />
              {t("performances_add")}
            </Button>
          </div>
        </form>
        <div className="mt-6 grid gap-3">
          {performanceItems.length > 0 ? (
            performanceItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-md border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{item.event_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[item.venue_name, item.city, item.performance_date].filter(Boolean).join(" · ")}
                  </p>
                  {item.event_type ? (
                    <Badge variant="secondary" className="mt-2">{t(`event_type_${item.event_type}`)}</Badge>
                  ) : null}
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => void deletePerformance(item.id)}>
                  <Trash2Icon data-icon="inline-start" />
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-md border bg-background p-4 text-sm text-muted-foreground">{t("performances_none")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function profileFormDisplayName(profile: Profile | null) {
  return profile?.stage_name || profile?.full_name || "Artist";
}

function SaveButton({
  disabled,
  isSubmitting,
  label,
}: Readonly<{
  disabled: boolean;
  isSubmitting: boolean;
  label: string;
}>) {
  return (
    <Button type="submit" disabled={disabled}>
      {isSubmitting ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}

function SpotifyConnectSection({
  connected,
  error,
  followers,
  isSyncing,
  onSync,
  topTracks,
}: Readonly<{
  connected: boolean;
  error: string | null;
  followers: number | null;
  isSyncing: boolean;
  onSync: () => void;
  topTracks: SpotifyDataPublic["top_tracks"];
}>) {
  const t = useTranslations("profile_edit");

  return (
    <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-green-500 text-white">
            <MusicIcon className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium">{t("spotify")}</p>
            {connected ? (
              <p className="text-xs text-green-600 dark:text-green-400">
                {t("spotify_connected")}
                {followers ? ` · ${new Intl.NumberFormat().format(followers)} ${t("spotify_followers_imported")}` : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("spotify_import_description")}</p>
            )}
          </div>
        </div>
        {connected ? (
          <Button type="button" variant="outline" disabled={isSyncing} onClick={onSync}>
            {isSyncing ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}
            {t("spotify_sync")}
          </Button>
        ) : (
          <Button asChild>
            <Link href="/api/auth/spotify">{t("spotify_connect")}</Link>
          </Button>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {topTracks && topTracks.length > 0 ? (
        <div className="mt-4 space-y-1">
          <p className="text-xs text-muted-foreground">{t("spotify_top_tracks")}</p>
          {topTracks.slice(0, 5).map((track) => (
            <a
              key={track.id}
              href={track.external_url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-muted-foreground hover:text-primary"
            >
              ♪ {track.name}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IconInput({
  icon: Icon,
  className,
  ...props
}: ComponentProps<typeof Input> & {
  icon: ComponentType<{ className?: string; "data-icon"?: string }>;
}) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        data-icon="inline-start"
      />
      <Input className={cn("pl-10", className)} {...props} />
    </div>
  );
}

function FormField({
  children,
  error,
  label,
}: Readonly<{
  children: ReactNode;
  error?: string;
  label: string;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      {children}
      <span className={cn("text-sm font-normal text-destructive", !error && "hidden")}>{error}</span>
    </label>
  );
}
