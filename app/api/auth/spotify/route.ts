import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const spotifyScopes = ["user-read-private", "user-read-email", "user-top-read", "user-follow-read"];

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(`${origin}/fr/profile/edit?tab=portfolio&spotify=missing-env`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/fr/auth?role=artist`);
  }

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: spotifyScopes.join(" "),
    state,
  });
  const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);

  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
