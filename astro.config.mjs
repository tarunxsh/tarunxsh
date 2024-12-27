import mdx from "@astrojs/mdx"
import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import tailwind from "@astrojs/tailwind"
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections"
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers"
import expressiveCode from "astro-expressive-code"
import { defineConfig } from "astro/config"


// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://tarunxsh.xyz",
  vite: {
    worker: {
      plugins: () => [],
    },
  },
  integrations: [
    react(),
    tailwind(),
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
