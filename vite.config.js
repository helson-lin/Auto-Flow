import { resolve } from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { chromeExtension } from "vite-plugin-chrome-extension";
import ViteComponents from "vite-plugin-components";

import ViteIcons, { ViteIconsResolver } from "vite-plugin-icons";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  build: {
    minify: 'terser',
    terserOptions: {
      keep_classnames: false,
      keep_fnames: false,
    },
    rollupOptions: {
      input: "src/manifest.json",
      output: {
          assetFileNames: '[name]-[hash].[ext]',
          manualChunks(id) {
              if (id.includes('node_modules')) {
                  return id.toString().split('node_modules/')[1].split('/')[0].toString();
              }
          }
      }
    }
  },
  plugins: [
    vue(),
    ViteComponents({
      extensions: ["vue"],
      // auto import icons
      customComponentResolvers: [
        // https://github.com/antfu/vite-plugin-icons
        ViteIconsResolver({
          componentPrefix: ""
          // enabledCollections: ['carbon']
        })
      ]
    }),
    ViteIcons(),
    chromeExtension()
  ],
});
