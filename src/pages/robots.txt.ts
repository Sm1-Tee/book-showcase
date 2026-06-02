import type { APIRoute } from 'astro';

const basePath = import.meta.env.BASE_URL;
const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

const getRobotsTxt = (sitemapURL: URL, textSitemapURL: URL) => `
User-agent: *
Allow: ${normalizedBasePath}
Disallow: ${normalizedBasePath}admin/

Sitemap: ${sitemapURL.href}
Sitemap: ${textSitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL(`${normalizedBasePath}sitemap.xml`, site);
  const textSitemapURL = new URL(`${normalizedBasePath}sitemap.txt`, site);
  return new Response(getRobotsTxt(sitemapURL, textSitemapURL), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
