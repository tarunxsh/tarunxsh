import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { BLOG_ROLL } from "../src/config/index.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const metaFile = join(__dirname, "../src/config/blog-roll-meta.json")

type Meta = { url: string; title: string; description: string; author: string; thumbnail: string }

const existing: Meta[] = JSON.parse(readFileSync(metaFile, "utf-8"))
const cached = new Set(existing.map((e) => e.url))
const missing = BLOG_ROLL.filter((url) => !cached.has(url))

if (missing.length === 0) {
  console.log("All URLs already cached.")
  process.exit(0)
}

console.log(`Fetching metadata for ${missing.length} URLs...`)

async function fetchMeta(url: string): Promise<Meta> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  const html = await res.text()

  const og = (property: string) =>
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]?.trim() ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"))?.[1]?.trim() ??
    ""

  const named = (name: string) =>
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]?.trim() ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"))?.[1]?.trim() ??
    ""

  return {
    url,
    title:       og("og:title")       || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || url,
    description: og("og:description") || named("description"),
    author:      og("article:author") || named("author"),
    thumbnail:   og("og:image"),
  }
}

const results = await Promise.allSettled(missing.map(fetchMeta))

const newEntries: Meta[] = results.map((result, i) => {
  if (result.status === "fulfilled") return result.value
  console.warn(`Failed ${missing[i]}: ${result.reason}`)
  return { url: missing[i], title: "", description: "", author: "", thumbnail: "" }
})

writeFileSync(metaFile, JSON.stringify([...existing, ...newEntries], null, 2))
console.log(`Done. Added ${newEntries.length} entries to blog-roll-meta.json.`)
