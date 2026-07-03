import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built app works whether hosted at a domain root,
// a sub-path, or opened from the filesystem.
export default defineConfig({
  base: './',
  plugins: [react()],
})
