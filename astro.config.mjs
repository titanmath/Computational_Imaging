// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { unified } from '@astrojs/markdown-remark';

// Déploiement : SITE = https://<user>.github.io, BASE = /<repo>/ (voir README).
const site = process.env.SITE ?? 'http://localhost:4321';
const base = process.env.BASE ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [svelte(), mdx()],
  markdown: {
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: 'ignore', throwOnError: true, output: 'html' }]],
    }),
  },
  vite: {
    resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
    worker: { format: 'es' },
    optimizeDeps: { include: ['three', 'gsap', 'd3-scale', 'd3-shape'] },
  },
});
