import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const basePath = import.meta.env.BASE_URL;
const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const GET: APIRoute = async ({ site }) => {
  const books = await getCollection('books');
  const urls = [
    { loc: new URL(normalizedBasePath, site).href },
    ...books.map((book) => ({
      loc: new URL(`${normalizedBasePath}books/${book.id}/`, site).href,
      lastmod: formatDate(book.data.pubDate),
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `
    <lastmod>${url.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
