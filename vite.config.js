import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        // If rolldown-vite fails on 'terser', we stop esbuild from renaming 
        // variables into duplicates like 'YZ'
        minify: 'esbuild',
    },
    esbuild: {
        minifyIdentifiers: false, // This directly fixes the "YZ has already been declared" bug
    }
});