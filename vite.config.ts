import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
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
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  optimizeDeps: {
    include: ['vue'], // Specify dependencies to be pre-bundled
  },
  server: {
    port: 3000,
    open: true,
  },
});
