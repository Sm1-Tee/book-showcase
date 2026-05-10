import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const githubRepository = process.env.GITHUB_REPOSITORY;
const [githubOwner, githubRepo] = githubRepository?.split('/') ?? [];
const base = githubRepo ? `/${githubRepo}` : '/book-showcase';

export default defineConfig({
  site: githubOwner ? `https://${githubOwner}.github.io` : 'http://localhost:4321',
  base,
  vite: {
    plugins: [tailwindcss()],
  },
});
