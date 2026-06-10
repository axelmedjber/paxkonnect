import type { Profile } from "@/lib/types";

export type ProfileCompletionKey =
  | "stage_name"
  | "bio"
  | "city"
  | "disciplines"
  | "avatar"
  | "social";

type CompletionRule = {
  key: ProfileCompletionKey;
  weight: number;
  isComplete: (profile: Profile | null) => boolean;
};

const socialFields = [
  "spotify_url",
  "youtube_url",
  "tiktok_url",
  "instagram_url",
  "website_url",
] as const;

const completionRules: CompletionRule[] = [
  {
    key: "stage_name",
    weight: 20,
    isComplete: (profile) => Boolean(profile?.stage_name),
  },
  {
    key: "bio",
    weight: 20,
    isComplete: (profile) => Boolean(profile?.bio),
  },
  {
    key: "city",
    weight: 10,
    isComplete: (profile) => Boolean(profile?.city),
  },
  {
    key: "disciplines",
    weight: 20,
    isComplete: (profile) => Boolean(profile?.artistic_disciplines?.length),
  },
  {
    key: "avatar",
    weight: 15,
    isComplete: (profile) => Boolean(profile?.avatar_url),
  },
  {
    key: "social",
    weight: 15,
    isComplete: (profile) => socialFields.some((field) => Boolean(profile?.[field])),
  },
];

export function isArtistProfileComplete(profile: Profile | null) {
  return Boolean(profile?.stage_name && profile.artistic_disciplines?.length);
}

export function getProfileCompletion(profile: Profile | null) {
  const missingFields = completionRules
    .filter((rule) => !rule.isComplete(profile))
    .map((rule) => rule.key);

  const percent = completionRules.reduce(
    (total, rule) => total + (rule.isComplete(profile) ? rule.weight : 0),
    0,
  );

  return {
    percent,
    missingFields,
  };
}
