import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import monacoEditorPlugin from 'vite-plugin-monaco-editor-esm';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), monacoEditorPlugin()],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'antd'],
          // 其他依赖可以继续添加
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      // '/static-cesium': {
      //   target: 'https://esm.sh/deeptwins-cesium@0.0.21/',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/static-cesium/, ''),
      // },
    },
  },
});
