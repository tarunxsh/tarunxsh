import rss from "@astrojs/rss"
import { META } from "~/config"
import { getPosts } from "~/utils"

export async function GET() {
  const posts = await getPosts()

  return rss({
    title: META.title,
    description: META.description,
    site:
      process.env.NODE_ENV === "development"
        ? "http://localhost:4321"
        : META.url,
    items: posts.map((post: any) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/posts/${post.id}/`,
      content: post.rendered ? post.rendered.html : post.data.description,
    })),
    customData: "",
  })
}
