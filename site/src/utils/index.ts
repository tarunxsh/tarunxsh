import type { CollectionEntry } from "astro:content"
import { getCollection } from "astro:content"

export const formatDate = (
  date: Date | string | undefined,
  format: string = "YYYY-MM-DD",
): string => {
  const validDate = date ? new Date(date) : new Date()

  const tokens: Record<string, string> = {
    YYYY: validDate.getFullYear().toString(),
    MM: String(validDate.getMonth() + 1).padStart(2, "0"),
    DD: String(validDate.getDate()).padStart(2, "0"),
    HH: String(validDate.getHours()).padStart(2, "0"),
    mm: String(validDate.getMinutes()).padStart(2, "0"),
    ss: String(validDate.getSeconds()).padStart(2, "0"),
    Mm: validDate.toLocaleString("default", { month: "short" }),
  }

  return format.replace(/YYYY|MM|DD|HH|mm|ss|Mm/g, (match) => tokens[match])
}

export const getPosts = async () => {
  const posts = await getCollection("blog", (post) => !post.data.hide)
  return posts.sort(
    (a: any, b: any) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  )
}

export const trimSlash = (path: string) => {
  let res = path
  if (res.endsWith("/")) {
    res = res.substring(0, res.length - 1)
  }
  if (res.startsWith("/")) {
    res = res.substring(1)
  }
  return res
}

export const pathEqual = (a: string, b: string) => {
  return trimSlash(a) === trimSlash(b)
}

export const getUniqueTags = (posts: CollectionEntry<"blog">[]) => {
  const tags: string[] = posts
    .filter((post) => !post.data.hide)
    .flatMap((post) => post.data.tags)
  return [...new Set(tags)]
}
