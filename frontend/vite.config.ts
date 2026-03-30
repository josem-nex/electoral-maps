import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// NOTE: Vite dev server handles SPA fallback automatically (all routes serve index.html).
// For production with Nginx, add this to your server block:
//   location / {
//     try_files $uri $uri/ /index.html;
//   }
export default defineConfig({
  plugins: [react()],
})
