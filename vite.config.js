import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        // Turning off minification stops the 'YZ' duplication bug completely
        minify: false,
    }
});