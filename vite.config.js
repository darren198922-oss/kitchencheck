import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Temporary local-dev config.
// Base44 plugin disabled so the exported app can run locally during migration.
// Added @ alias manually because Base44 plugin was previously providing it.
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
});
