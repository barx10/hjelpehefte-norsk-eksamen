import { defineConfig } from 'astro/config';

// BASE og SITE kan overstyres ved bygging, for eksempel ved eget domene på Lærerliv.
export default defineConfig({
  site: process.env.SITE ?? 'https://barx10.github.io',
  base: process.env.BASE ?? '/hjelpehefte-norsk-eksamen',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
