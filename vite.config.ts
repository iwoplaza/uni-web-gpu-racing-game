import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { socketIOServer } from './socketIOVitePlugin';

export default defineConfig({
  plugins: [sveltekit(), socketIOServer],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
});
