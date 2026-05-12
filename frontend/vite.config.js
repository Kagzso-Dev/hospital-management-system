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
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Router — loaded once, changes rarely
          if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/') || id.includes('node_modules/@remix-run/')) {
            return 'vendor-router';
          }
          // Charts — only used in Admin/Analytics
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-') || id.includes('node_modules/d3/') || id.includes('node_modules/victory-vendor/')) {
            return 'vendor-charts';
          }
          // Socket.io — only used in DoctorDashboard
          if (id.includes('node_modules/socket.io-client/') || id.includes('node_modules/engine.io-client/') || id.includes('node_modules/@socket.io/')) {
            return 'vendor-socket';
          }
          // Axios — shared utility
          if (id.includes('node_modules/axios/') || id.includes('node_modules/follow-redirects/')) {
            return 'vendor-axios';
          }
          // Do NOT add a catch-all for node_modules — let Rollup handle the rest
          // to avoid circular chunk dependencies
        },
      },
    },
  },
});
