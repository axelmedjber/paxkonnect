import { NextRequest, NextResponse } from "next/server";

import { exchangeSpotifyCode, fetchSpotifyImportData, getTokenExpiresAt } from "@/lib/spotify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("spotify_oauth_state")?.value;
  const redirectUrl = `${origin}/fr/profile/edit?tab=portfolio`;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${redirectUrl}&spotify=invalid-state`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/fr/auth?role=artist`);
  }

  try {
    const token = await exchangeSpotifyCode(code);
    const spotifyProfile = await fetchSpotifyImportData(token.access_token);
    const adminSupabase = createAdminClient();
    const { data: profile, error: profileReadError } = await adminSupabase
      .from("profiles")
      .select("avatar_url,full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      throw new Error(profileReadError.message);
    }

    const { error: profileUpdateError } = await adminSupabase
      .from("profiles")
      .update({
        avatar_url: profile?.avatar_url || spotifyProfile.avatarUrl,
        full_name: profile?.full_name || spotifyProfile.displayName,
        spotify_followers: spotifyProfile.followers,
        spotify_url: spotifyProfile.spotifyUrl,
        stats_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      throw new Error(profileUpdateError.message);
    }

    const { error: spotifyDataError } = await adminSupabase.from("spotify_data").upsert(
      {
        access_token: token.access_token,
        profile_id: user.id,
        refresh_token: token.refresh_token ?? null,
        spotify_id: spotifyProfile.spotifyId,
        synced_at: new Date().toISOString(),
        token_expires_at: getTokenExpiresAt(token.expires_in),
        top_tracks: spotifyProfile.topTracks,
      },
      { onConflict: "profile_id" },
    );

    if (spotifyDataError) {
      throw new Error(spotifyDataError.message);
    }

    const response = NextResponse.redirect(`${redirectUrl}&spotify=connected`);
    response.cookies.delete("spotify_oauth_state");
    return response;
  } catch (error) {
    console.error("[spotify callback]", error);
    return NextResponse.redirect(`${redirectUrl}&spotify=error`);
  }
}
