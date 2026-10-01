import mdx from "@astrojs/mdx"
import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections"
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers"
import expressiveCode from "astro-expressive-code"
import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"


// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://tarunxsh.xyz",
  vite: {
    plugins: [tailwindcss()],
    worker: {
      plugins: () => [],
    },
    server: {
      fs: {
        // Allow serving files from one level up
        allow: ['..']
      }
    }
  },
  integrations: [
    react(),
    sitemap(),
    expressiveCode({
      plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
      themes: ["material-theme-lighter", "material-theme-darker"],
      defaultProps: {
        showLineNumbers: true,
      },
    }),
    mdx(),
  ],
})
