import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        },
      }
    },
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 4096,
    sourceMap: false, // Disable source maps in production
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    open: true,
  },
});
