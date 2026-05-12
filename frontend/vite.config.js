import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },

  build: {
    // Raise the warning threshold slightly — our split chunks will all be well under this
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — always needed, cache long-term
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Router — loaded once, changes rarely
          if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) {
            return 'vendor-router';
          }
          // Charts — only used in Admin/Analytics, split out so other pages don't pay the cost
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          // Socket.io — only used in DoctorDashboard
          if (id.includes('node_modules/socket.io-client/') || id.includes('node_modules/engine.io-client/')) {
            return 'vendor-socket';
          }
          // Axios — shared utility, small
          if (id.includes('node_modules/axios/')) {
            return 'vendor-axios';
          }
          // Everything else in node_modules gets its own vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
});
