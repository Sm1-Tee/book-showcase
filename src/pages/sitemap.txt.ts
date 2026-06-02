import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const basePath = import.meta.env.BASE_URL;
const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

export const GET: APIRoute = async ({ site }) => {
  const books = await getCollection('books');
  const urls = [
    new URL(normalizedBasePath, site).href,
    ...books.map((book) => new URL(`${normalizedBasePath}books/${book.id}/`, site).href),
  ];

  return new Response(`${urls.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
