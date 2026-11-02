/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `base: './'` produces relative asset paths, so the same build works on
// GitHub Pages (https://<user>.github.io/<repo>/) and when served locally.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
