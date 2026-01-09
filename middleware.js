import { NextResponse } from 'next/server';
import { securityHeaders, rateLimit } from './middleware/security';

// Debug function removed for production

export function middleware(request) {
  // Force HTTPS redirect for production
  if (process.env.NODE_ENV === 'production' && 
      request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    );
  }
  
  const response = NextResponse.next();
  
  // Apply security headers
  securityHeaders(response);
  
  // Apply rate limiting
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const isAuthRequest = false; // Auth routes removed
  
  const isEmailVerification = false; // Email verification removed

  // Debug logging removed for production
  
  // Enhanced DDoS protection with multiple layers
  const now = Date.now();
  
  // Layer 1: Basic rate limiting
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = isAuthRequest ? 50 : (isEmailVerification ? 30 : 200); // 50 for auth requests, 30 for email verification, 200 for normal pages
  
  // Layer 2: Burst protection (short window)
  const burstWindowMs = 60 * 1000; // 1 minute
  const maxBurstRequests = isAuthRequest ? 20 : (isEmailVerification ? 10 : 100); // 20 for auth requests, 10 for email verification, 100 for normal pages
  
  // Layer 3: Suspicious activity detection
  const suspiciousWindowMs = 5 * 60 * 1000; // 5 minutes
  const maxSuspiciousRequests = isEmailVerification ? 50 : 200; // 50 for email verification, 200 for normal browsing
  
  // Simple in-memory rate limiting (in production, use Redis)
  const rateLimitKey = `${ip}:${isAuthRequest ? 'auth' : (isEmailVerification ? 'email' : 'general')}`;
  const rateLimitData = global.rateLimitStore || (global.rateLimitStore = new Map());
  
  if (!rateLimitData.has(rateLimitKey)) {
    rateLimitData.set(rateLimitKey, []);
  }
  
  const requests = rateLimitData.get(rateLimitKey);
  const validRequests = requests.filter(timestamp => timestamp > now - windowMs);
  const burstRequests = requests.filter(timestamp => timestamp > now - burstWindowMs);
  const suspiciousRequests = requests.filter(timestamp => timestamp > now - suspiciousWindowMs);

  // Rate limiting check
  
  // Check burst protection
  if (burstRequests.length >= maxBurstRequests) {
    return new Response('Too many requests in short time', { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': maxBurstRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(now + burstWindowMs).toISOString()
      }
    });
  }
  
  // Check suspicious activity
  if (suspiciousRequests.length >= maxSuspiciousRequests) {
    return new Response('Suspicious activity detected', { 
      status: 429,
      headers: {
        'Retry-After': '300',
        'X-RateLimit-Limit': maxSuspiciousRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(now + suspiciousWindowMs).toISOString()
      }
    });
  }
  
  // Check general rate limit
  if (validRequests.length >= maxRequests) {
    return new Response('Too many requests', { 
      status: 429,
      headers: {
        'Retry-After': '900',
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      }
    });
  }
  
  validRequests.push(now);
  rateLimitData.set(rateLimitKey, validRequests);
  
  // Debug logging for successful request
  
  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', (maxRequests - validRequests.length).toString());
  response.headers.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
  
  // Add secure cookie headers
  response.headers.set('Set-Cookie', [
    'session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    'csrf=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  ].join(', '));
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.txt$).*)',
  ],
};
