"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fetchSpotifyImportData, getTokenExpiresAt, refreshSpotifyAccessToken } from "@/lib/spotify";
import { localizedPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function refreshSpotifyData(locale: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localizedPath(locale, "/auth"));
  }

  const adminSupabase = createAdminClient();
  const { data: spotifyData, error: spotifyDataError } = await adminSupabase
    .from("spotify_data")
    .select("refresh_token")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (spotifyDataError) {
    console.error("[spotify refresh]", spotifyDataError.message);
    return { success: false, error: spotifyDataError.message };
  }

  if (!spotifyData?.refresh_token) {
    return { success: false, error: "Spotify is not connected." };
  }

  try {
    const token = await refreshSpotifyAccessToken(spotifyData.refresh_token);
    const spotifyProfile = await fetchSpotifyImportData(token.access_token);
    const nextRefreshToken = token.refresh_token ?? spotifyData.refresh_token;

    const { error: profileUpdateError } = await adminSupabase
      .from("profiles")
      .update({
        spotify_followers: spotifyProfile.followers,
        spotify_url: spotifyProfile.spotifyUrl,
        stats_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("[spotify refresh]", profileUpdateError.message);
      return { success: false, error: profileUpdateError.message };
    }

    const { error } = await adminSupabase
      .from("spotify_data")
      .update({
        access_token: token.access_token,
        refresh_token: nextRefreshToken,
        spotify_id: spotifyProfile.spotifyId,
        synced_at: new Date().toISOString(),
        token_expires_at: getTokenExpiresAt(token.expires_in),
        top_tracks: spotifyProfile.topTracks,
      })
      .eq("profile_id", user.id);

    if (error) {
      console.error("[spotify refresh]", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath(localizedPath(locale, "/profile/edit"));
    revalidatePath(localizedPath(locale, `/artists/${user.id}`));

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spotify sync failed.";
    console.error("[spotify refresh]", message);
    return { success: false, error: message };
  }
}
