export type EmbedType =
  | "spotify"
  | "youtube"
  | "soundcloud"
  | "bandcamp"
  | "tiktok"
  | "vimeo"
  | "unknown";

export interface EmbedResult {
  type: EmbedType;
  embedUrl?: string;
  originalUrl: string;
}

function getUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getPathId(url: string, marker: string) {
  return url.split(marker)[1]?.split("?")[0]?.split("#")[0] || null;
}

export function getEmbedUrl(url: string): EmbedResult {
  if (!url) {
    return { type: "unknown", originalUrl: url };
  }

  if (url.includes("spotify.com/track")) {
    const id = getPathId(url, "/track/");
    return {
      type: "spotify",
      embedUrl: id ? `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0` : undefined,
      originalUrl: url,
    };
  }

  if (url.includes("spotify.com/playlist")) {
    const id = getPathId(url, "/playlist/");
    return {
      type: "spotify",
      embedUrl: id ? `https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0` : undefined,
      originalUrl: url,
    };
  }

  if (url.includes("spotify.com/album")) {
    const id = getPathId(url, "/album/");
    return {
      type: "spotify",
      embedUrl: id ? `https://open.spotify.com/embed/album/${id}?utm_source=generator&theme=0` : undefined,
      originalUrl: url,
    };
  }

  if (url.includes("spotify.com/artist")) {
    const id = getPathId(url, "/artist/");
    return {
      type: "spotify",
      embedUrl: id ? `https://open.spotify.com/embed/artist/${id}?utm_source=generator&theme=0` : undefined,
      originalUrl: url,
    };
  }

  if (url.includes("youtube.com/watch")) {
    const parsedUrl = getUrl(url);
    const id = parsedUrl?.searchParams.get("v");
    return {
      type: "youtube",
      embedUrl: id ? `https://www.youtube.com/embed/${id}?rel=0` : undefined,
      originalUrl: url,
    };
  }

  if (url.includes("youtube.com/embed/")) {
    const id = getPathId(url, "/embed/");
    return {
      type: "youtube",
      embedUrl: id ? `https://www.youtube.com/embed/${id}?rel=0` : undefined,
      originalUrl: url,
    };
  }

  if (url.includes("youtu.be/")) {
    const id = getPathId(url, "youtu.be/");
    return {
      type: "youtube",
      embedUrl: id ? `https://www.youtube.com/embed/${id}?rel=0` : undefined,
      originalUrl: url,
    };
  }

  if (url.includes("youtube.com/@") || url.includes("youtube.com/channel")) {
    return { type: "youtube", originalUrl: url };
  }

  if (url.includes("soundcloud.com")) {
    return {
      type: "soundcloud",
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%237C3AED&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      originalUrl: url,
    };
  }

  if (url.includes("vimeo.com")) {
    const id = getPathId(url, "vimeo.com/");
    return {
      type: "vimeo",
      embedUrl: id ? `https://player.vimeo.com/video/${id}?color=7C3AED&title=0&byline=0` : undefined,
      originalUrl: url,
    };
  }

  if (url.includes("tiktok.com")) {
    return { type: "tiktok", originalUrl: url };
  }

  if (url.includes("bandcamp.com")) {
    return { type: "bandcamp", originalUrl: url };
  }

  return { type: "unknown", originalUrl: url };
}
