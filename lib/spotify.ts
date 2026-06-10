import "server-only";

import type { SpotifyTopTrack } from "@/lib/types";

type SpotifyTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
};

type SpotifyMeResponse = {
  display_name?: string;
  external_urls?: {
    spotify?: string;
  };
  followers?: {
    total?: number;
  };
  id: string;
  images?: Array<{
    url: string;
  }>;
};

type SpotifyTopTracksResponse = {
  items?: Array<{
    external_urls?: {
      spotify?: string;
    };
    id: string;
    name: string;
    preview_url?: string | null;
  }>;
};

function getSpotifyEnv() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Spotify OAuth env vars are missing.");
  }

  return { clientId, clientSecret, redirectUri };
}

function getAuthHeader(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function exchangeSpotifyCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getSpotifyEnv();
  const response = await fetch("https://accounts.spotify.com/api/token", {
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    headers: {
      Authorization: `Basic ${getAuthHeader(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Spotify token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<SpotifyTokenResponse>;
}

export async function refreshSpotifyAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getSpotifyEnv();
  const response = await fetch("https://accounts.spotify.com/api/token", {
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: {
      Authorization: `Basic ${getAuthHeader(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Spotify token refresh failed: ${response.status}`);
  }

  return response.json() as Promise<SpotifyTokenResponse>;
}

async function getSpotifyJson<T>(accessToken: string, url: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSpotifyImportData(accessToken: string) {
  const [me, topTracksResponse] = await Promise.all([
    getSpotifyJson<SpotifyMeResponse>(accessToken, "https://api.spotify.com/v1/me"),
    getSpotifyJson<SpotifyTopTracksResponse>(
      accessToken,
      "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=5",
    ),
  ]);
  const topTracks: SpotifyTopTrack[] = (topTracksResponse.items ?? []).map((track) => ({
    external_url: track.external_urls?.spotify ?? null,
    id: track.id,
    name: track.name,
    preview_url: track.preview_url ?? null,
  }));

  return {
    avatarUrl: me.images?.[0]?.url ?? null,
    displayName: me.display_name ?? null,
    followers: me.followers?.total ?? null,
    spotifyId: me.id,
    spotifyUrl: me.external_urls?.spotify ?? null,
    topTracks,
  };
}

export function getTokenExpiresAt(expiresInSeconds: number) {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
