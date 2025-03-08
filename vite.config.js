import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild:{
loader:'jsx',
  },
  server: {
    https: false, // Disable HTTPS if running locally without certificates
    watch: {
      usePolling: true, // Fix HMR issues
    },
}});
