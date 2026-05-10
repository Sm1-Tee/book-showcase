import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const booksCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/books" }),
  schema: ({ image }) => z.object({
    coverImage: image(),
    exampleImages: z.array(image()).max(4),
    title: z.string(),
    author: z.string(),
    colorEpub: z.string(), // путь к файлу
    bwEpub: z.string(), // путь к файлу
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
  }),
});

export const collections = {
  'books': booksCollection,
};
