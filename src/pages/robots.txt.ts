import type { APIRoute } from 'astro';

// Все адреса для поисковиков ведут на канонический сайт в корне домена.
const canonicalHost = 'https://sm1-tee.github.io';

const basePath = import.meta.env.BASE_URL;
const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

const getRobotsTxt = () => `User-agent: *
Allow: ${normalizedBasePath}
Disallow: ${normalizedBasePath}admin/

Sitemap: ${canonicalHost}/sitemap.xml
Sitemap: ${canonicalHost}/sitemap.txt
Sitemap: ${canonicalHost}/sitemap-index.xml
`;

export const GET: APIRoute = () => {
  return new Response(getRobotsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
