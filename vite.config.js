import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        target: 'es2022', // Forces the builder to output modern, compatible JS syntax
        cssCodeSplit: true,
    },
});