import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT: Adjust repoName if your repository name differs.
const repoName = 'exotic-car-rental-3d';

// If deploying under user.github.io root, set base: '/'.
// Otherwise keep `/${repoName}/` for GitHub Pages project site.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || `/${repoName}/`,
  plugins: [react()],
  build: {
    sourcemap: true
  }
});