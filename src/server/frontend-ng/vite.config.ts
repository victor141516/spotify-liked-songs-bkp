import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // @ts-ignore
  ssgOptions: {
    includedRoutes(paths, routes) {
      // TODO: check why the compiler says `[Vue Router warn]: Location "//me/index" resolved to "//me/index". A resolved location cannot start with multiple slashes.`
      return routes.flatMap((route) => `/${route.path}/index`)
    }
  }
})
