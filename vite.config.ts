import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), react()],
	build: {
		emptyOutDir: true,
		outDir: 'dist',
		rolldownOptions: {
			input: {
				index: 'index.html',
				background: 'src/background.ts',
			},
			output: {
				entryFileNames: '[name].js',
			},
		},
	},
});
