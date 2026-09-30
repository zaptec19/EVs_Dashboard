import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes the build work from any GitHub Pages sub-path (all routing is in the URL hash).
export default defineConfig({
  base: './',
  plugins: [react()],
});
