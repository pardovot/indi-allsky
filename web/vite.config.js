import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var target = env.VITE_API_TARGET || 'https://localhost';
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
                '/indi-allsky': {
                    target: target,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
});
