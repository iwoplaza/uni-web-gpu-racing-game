import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { socketIOServer } from './socketIOVitePlugin';

export default defineConfig((configEnv) => {
  return {
    plugins: [sveltekit(), configEnv.mode !== 'test' ? socketIOServer : null],
    test: {
      include: ['src/**/*.{test,spec}.{js,ts}']
    }
  };
});
