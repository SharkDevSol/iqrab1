import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          // Axios
          if (id.includes('node_modules/axios')) return 'vendor-axios';
          // Icons
          if (id.includes('node_modules/react-icons')) return 'vendor-icons';
          // Framer motion
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          // Charts - merge with antd to avoid version conflict
          if (id.includes('node_modules/recharts') || id.includes('node_modules/@ant-design/charts') || id.includes('node_modules/@ant-design/plots')) return 'vendor-antd';
          // Ant Design
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) return 'vendor-antd';
          // Date libraries
          if (id.includes('node_modules/dayjs') || id.includes('node_modules/moment')) return 'vendor-date';
          // PDF/export
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/xlsx') || id.includes('node_modules/html2canvas')) return 'vendor-export';
          // Guardian pages
          if (id.includes('/src/Guardian/')) return 'pages-guardian';
          // Staff pages
          if (id.includes('/src/Staff/') || id.includes('/src/PAGE/HR')) return 'pages-staff';
          // Finance pages
          if (id.includes('/src/PAGE/Finance')) return 'pages-finance';
          // Academic pages
          if (id.includes('/src/PAGE/Academic') || id.includes('/src/PAGE/CreateMarklist') || id.includes('/src/PAGE/MarkListView')) return 'pages-academic';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    https: fs.existsSync('./certs/cert.pem') ? {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem'),
    } : false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', 
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          // Log proxy requests for debugging
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying:', req.method, req.url, '→', options.target + req.url);
          });
        }
      }
    }
  }
});