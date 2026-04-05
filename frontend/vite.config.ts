import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.Claude_API_KEY': JSON.stringify(env.Claude_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'zustand',
        'motion/react',
        'lucide-react',
        'date-fns',
        'clsx',
        'tailwind-merge',
      ],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      warmup: {
        clientFiles: ['./src/App.tsx', './src/main.tsx'],
      },
      proxy: {
        '/api/session': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/session', '/session'),
          ws: true,
        },
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
    },
  };
});
