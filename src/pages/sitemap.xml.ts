import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Карта сайта всегда перечисляет канонические адреса (корень домена),
// чтобы не противоречить rel="canonical" на самих страницах.
const canonicalHost = 'https://sm1-tee.github.io';

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const GET: APIRoute = async () => {
  const books = await getCollection('books');
  const urls = [
    { loc: `${canonicalHost}/` },
    ...books.map((book) => ({
      loc: `${canonicalHost}/books/${book.id}/`,
      lastmod: formatDate(book.data.pubDate),
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
