import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Список адресов только в каноническом виде (корень домена).
const canonicalHost = 'https://sm1-tee.github.io';

export const GET: APIRoute = async () => {
  const books = await getCollection('books');
  const urls = [
    `${canonicalHost}/`,
    ...books.map((book) => `${canonicalHost}/books/${book.id}/`),
  ];

  return new Response(`${urls.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
