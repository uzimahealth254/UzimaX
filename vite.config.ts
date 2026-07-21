import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Prevent duplicate @tanstack/react-query instances (breaks QueryClientProvider)
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  optimizeDeps: {
    include: ['@tanstack/react-query', 'react', 'react-dom'],
  },
});
