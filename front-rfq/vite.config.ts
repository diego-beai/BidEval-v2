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
      '/api/n8n/chat': {
        target: 'https://n8n.beaienergy.com/webhook/chat-rfq',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/tabla': {
        target: 'https://n8n.beaienergy.com/webhook/tabla',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/ofertas': {
        target: 'https://n8n.beaienergy.com/webhook/ofertas-proveedores',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/ingesta-rfq': {
        target: 'https://n8n.beaienergy.com/webhook/ingesta-rfq',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/mail': {
        target: 'https://n8n.beaienergy.com/webhook/mail',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-audit': {
        target: 'https://n8n.beaienergy.com/webhook/qa-audit-generator',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/proposals': {
        target: 'https://n8n.beaienergy.com/webhook/proposals-evaluations',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-process-responses': {
        target: 'https://n8n.beaienergy.com/webhook/qa-process-responses',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-send-to-supplier': {
        target: 'https://n8n.beaienergy.com/webhook/qa-send-to-supplier',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-send-email': {
        target: 'https://n8n.beaienergy.com/webhook/qa-send-email',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-process-email-response': {
        target: 'https://n8n.beaienergy.com/webhook/qa-process-email-response',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/scoring': {
        target: 'https://n8n.beaienergy.com/webhook/scoring-evaluation',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
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
