/// <reference types="vitest" />
import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'markdown'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('@radix-ui')) return 'radix'
          if (id.includes('@tanstack/react-query')) return 'query'
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor'
          }

          return 'vendor'
        },
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
} as UserConfig)
