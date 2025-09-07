import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set this to your repository name for GitHub Pages project deployment.
const repoName = '3dc';

/**
 * Notes:
 * - For a project site at: https://<user>.github.io/3dc/
 *   base MUST be '/3dc/'.
 * - If you later move this to a user/organization root repo named
 *   <user>.github.io then change base to '/'.
 * - You can override at build time with: VITE_BASE_PATH=/some/other/base npm run build
 */
const explicitBase = process.env.VITE_BASE_PATH || `/${repoName}/`;

export default defineConfig({
  base: explicitBase,
  plugins: [react()],
  build: {
    sourcemap: true
  }
});