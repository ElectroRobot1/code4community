import { withAppCheck } from '@/utils/appCheck';

async function avatarHandler(request) {
  try {
    // Rate limiting check
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Basic rate limiting (in production, use Redis)
    const rateLimitKey = `avatar:${ip}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 30; // 30 requests per minute
    
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }
    
    const rateLimitData = global.rateLimitStore.get(rateLimitKey) || [];
    const validRequests = rateLimitData.filter(timestamp => timestamp > now - windowMs);
    
    if (validRequests.length >= maxRequests) {
      return new Response('Too many requests', { 
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      });
    }
    
    validRequests.push(now);
    global.rateLimitStore.set(rateLimitKey, validRequests);

    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('u');
    const szParam = searchParams.get('sz');

    if (!urlParam) {
      return new Response('Missing parameter: u', { status: 400 });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(urlParam);
    } catch (_e) {
      return new Response('Invalid URL', { status: 400 });
    }

    // Allow only Google avatar host to prevent SSRF
    if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'lh3.googleusercontent.com') {
      return new Response('Host not allowed', { status: 400 });
    }

    // Normalize Google avatar URL to a specific size
    const size = (() => {
      const n = parseInt(szParam || '96', 10);
      if (Number.isNaN(n)) return 96;
      return Math.min(256, Math.max(32, n));
    })();

    // Strip any existing Google size/transform suffix in the path (e.g., "=s96-c" or other variants)
    const cleanedPathname = parsedUrl.pathname.replace(/=[^/]*$/, '');
    const normalizedUrl = `${parsedUrl.origin}${cleanedPathname}=s${size}-c`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstreamResponse = await fetch(normalizedUrl, {
      // Revalidate daily; let platforms like Vercel cache at the edge
      next: { revalidate: 86400 },
      headers: {
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; BRHS-App/1.0)'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!upstreamResponse.ok) {
      return new Response('Upstream fetch failed', { status: upstreamResponse.status });
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const contentLength = arrayBuffer.byteLength.toString();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Content-Length': contentLength,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    });
  } catch (_err) {
    return new Response('Server error', { status: 500 });
  }
}

// Export the handler wrapped with App Check validation
export const GET = withAppCheck(avatarHandler);


