import { OGImageRoute } from "astro-og-canvas"
import { getPosts } from "~/utils"
import {META} from "~/config"

const posts = await getPosts()

// Transform the collection into an object
// @ts-ignore
const pages = Object.fromEntries(posts.map(({ id, data }) => [id, { ...data }]))

// Generates OG images at /og/<post-id>.png, e.g. /og/learning-astro.png
export const { getStaticPaths, GET } = await OGImageRoute({
  pages: {
    ...META.pageMeta,
    ...pages,
  },

  // For each page, this callback will be used to customize the OpenGraph image.
  getImageOptions: async (path, page) => {

    if(Object.keys(META.pageMeta).includes(path)) {
      const ogImagePath = `./src/assets/${page.ogImage || 'og-light.png'}`;
      return { title: "", bgImage: {path: ogImagePath, fit: "fill"} }
    }

    // customised og image for blog posts
    return {
      title: page.title,
      description: page.description,
      bgGradient: [
        [6, 38, 45],
        [8, 3, 2],
      ],
      logo: {
        path: "./src/assets/avatar.png",
        size: [100],
      },
      fonts: ["./public/fonts/hwmc.otf"],
    }
  },
})

