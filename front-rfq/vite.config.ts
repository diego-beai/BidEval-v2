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
        target: 'https://n8n.beaienergy.com/webhook/chat-rfq-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/tabla': {
        target: 'https://n8n.beaienergy.com/webhook/tabla-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/ofertas': {
        target: 'https://n8n.beaienergy.com/webhook/ofertas-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/ingesta-rfq': {
        target: 'https://n8n.beaienergy.com/webhook/ingesta-rfq-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/mail': {
        target: 'https://n8n.beaienergy.com/webhook/mail-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-audit': {
        target: 'https://n8n.beaienergy.com/webhook/qa-audit-generator-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/proposals': {
        target: 'https://n8n.beaienergy.com/webhook/proposals-evaluations-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-process-responses': {
        target: 'https://n8n.beaienergy.com/webhook/qa-process-responses-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-send-to-supplier': {
        target: 'https://n8n.beaienergy.com/webhook/qa-send-to-supplier-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-send-email': {
        target: 'https://n8n.beaienergy.com/webhook/qa-send-email-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/qa-process-email-response': {
        target: 'https://n8n.beaienergy.com/webhook/qa-process-email-response-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/scoring': {
        target: 'https://n8n.beaienergy.com/webhook/scoring-evaluation-desarrollo',
        changeOrigin: true,
        secure: true,
        rewrite: () => '',
      },
      '/api/n8n/rfp-generate': {
        target: 'https://n8n.beaienergy.com/webhook/rfp-generate-desarrollo',
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
