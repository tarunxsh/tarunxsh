import { OGImageRoute } from "astro-og-canvas"
import { getPosts } from "~/utils"

const posts = await getPosts()

// Transform the collection into an object
// @ts-ignore
const pages = Object.fromEntries(posts.map(({ id, data }) => [id, { data }]))

// Generates OG images at /og/<post-id>.png, e.g. /og/learning-astro.png
export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: async (_, { data }: (typeof pages)[string]) => {
    return {
      title: data.title,
      description: data.description,
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

