import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_TARGET || 'https://localhost';

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 3000,
      strictPort: true,
      host: true,
      proxy: {
        '/indi-allsky/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/indi-allsky/images': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/indi-allsky/static': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
