import { withAppCheck } from "@/utils/appCheck";
import { avatarRouteRateLimit } from "@/utils/rateLimit";
import sharp from "sharp";

const AVATAR_FETCH_TIMEOUT_MS = 8000;
const DEFAULT_AVATAR_SIZE = 96;
const MIN_AVATAR_SIZE = 32;
const MAX_AVATAR_SIZE = 256;

function normalizeRequestedSize(szParam) {
  const parsed = parseInt(szParam || `${DEFAULT_AVATAR_SIZE}`, 10);
  if (Number.isNaN(parsed)) return DEFAULT_AVATAR_SIZE;
  return Math.min(MAX_AVATAR_SIZE, Math.max(MIN_AVATAR_SIZE, parsed));
}

async function avatarHandler(request) {
  try {
    const rateLimit = avatarRouteRateLimit(request);
    if (!rateLimit.allowed) {
      return new Response("Too many requests", {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get("u");
    const szParam = searchParams.get("sz");

    if (!urlParam) {
      return new Response("Missing parameter: u", { status: 400 });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(urlParam);
    } catch (_e) {
      return new Response("Invalid URL", { status: 400 });
    }

    // Allow only Google avatar host to prevent SSRF
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== "lh3.googleusercontent.com"
    ) {
      return new Response("Host not allowed", { status: 400 });
    }

    const size = normalizeRequestedSize(szParam);
    // Keep only the original image URL and apply consistent resizing server-side.
    const normalizedUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AVATAR_FETCH_TIMEOUT_MS);
    const upstreamResponse = await fetch(normalizedUrl, {
      // Revalidate daily; let platforms like Vercel cache at the edge
      next: { revalidate: 86400 },
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; BRHS-App/1.0)",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstreamResponse.ok) {
      return new Response("Upstream fetch failed", {
        status: upstreamResponse.status,
      });
    }

    const sourceBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    const resizedBuffer = await sharp(sourceBuffer)
      .resize(size, size, {
        fit: "cover",
        position: "center",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    const contentLength = resizedBuffer.byteLength.toString();

    return new Response(resizedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Length": contentLength,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    });
  } catch (_err) {
    return new Response("Server error", { status: 500 });
  }
}

// Export the handler wrapped with App Check validation
export const GET = withAppCheck(avatarHandler);


