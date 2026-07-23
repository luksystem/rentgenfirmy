const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{6,20}$/;

/** Wyciąga ID filmu z dowolnego formatu linku YouTube (watch, youtu.be, embed, shorts). */
export function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");

  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") {
      candidate = parsed.searchParams.get("v");
    } else {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if ((segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") && segments[1]) {
        candidate = segments[1];
      }
    }
  }

  if (!candidate || !YOUTUBE_ID_PATTERN.test(candidate)) {
    return null;
  }

  return candidate;
}

export function isValidYoutubeUrl(url: string): boolean {
  return extractYoutubeVideoId(url) !== null;
}

export function buildYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function buildYoutubeThumbnailUrl(url: string): string | null {
  const id = extractYoutubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
