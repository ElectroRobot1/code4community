import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://code4community.net';
  
  const robotsTxt = `User-agent: *
Allow: /
Allow: /welcome
Allow: /login
Allow: /signup
Allow: /reset-password

# Disallow protected/private pages
Disallow: /mathlab
Disallow: /mathlab/history
Disallow: /settings
Disallow: /admin
Disallow: /verify-email
Disallow: /check-email
Disallow: /api/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (be respectful)
Crawl-delay: 1`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
