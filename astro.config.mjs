import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const githubRepository = process.env.GITHUB_REPOSITORY;
const [githubOwner, githubRepo] = githubRepository?.split('/') ?? [];
const base = githubRepo ? `/${githubRepo}` : '/chit-ai';
const site = githubOwner ? `https://${githubOwner}.github.io` : 'https://sm1-tee.github.io';

export default defineConfig({
  site,
  base,
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin')
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
