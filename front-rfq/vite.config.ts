import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3002,
    open: true,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    },
    proxy: {
      // Proxy para evitar problemas de CORS con n8n durante desarrollo
      '/api/n8n': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        rewrite: (path) => {
          // Mantener la estructura completa del path, solo remover /api/n8n
          // /api/n8n/webhook-test/rfq -> /webhook-test/rfq
          return path.replace(/^\/api\/n8n/, '');
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Agregar headers necesarios para n8n
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Content-Type', 'application/json');
          });
        },
      }
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          table: ['@tanstack/react-table'],
          state: ['zustand'],
          utils: ['xlsx'],
          ui: ['react-dropzone', 'clsx']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    cssCodeSplit: true,
    reportCompressedSize: false
  }
});
