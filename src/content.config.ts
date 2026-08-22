import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const booksCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/books" }),
  schema: ({ image }) => z.object({
    coverImage: image(),
    exampleImages: z.array(image()).max(4),
    title: z.string(),
    author: z.string(),
    year: z.number().int().min(1).max(2100).optional(),
    genre: z.string().min(1).optional(),
    pubDate: z.date().or(z.string().transform(str => new Date(str))),
    colorEpub: z.string().url("Укажите корректную ссылку на GitHub Releases"), // внешняя ссылка
    bwEpub: z.string().url("Укажите корректную ссылку на GitHub Releases"), // внешняя ссылка
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
  }),
});

export const collections = {
  'books': booksCollection,
};
