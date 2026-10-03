---
title: "How things are working here !"
pubDate: 2026-10-01
description: "Exploring Astro while building my personal website"
ogImage: "https://tarunxsh.xyz/profile.jpeg"
author: "Tarunesh Gautam"
image:
  url: "https://docs.astro.build/assets/rose.webp"
  alt: "alt"
tags: ["astro", "ssg"]
---




> **Note:** These are my personal notes on how Astro works. The content here is heavily AI-driven and written as I explore the framework while building this site.

This website is built with [Astro](https://astro.build) and deployed to [GitHub Pages](http://pages.github.com/). Lets see how things are working here.


### ClientRouter

`ClientRouter` is Astro's SPA router. Placing `<ClientRouter />` in `<head>` injects a small script that intercepts all link clicks on the page. It requires no route map or config -- it simply reads the `href` of whatever `<a>` was clicked and handles the navigation itself.

**On hover -- prefetch**

The moment the cursor touches a link, the script fires a `fetch()` for that URL and stores the raw HTML string in memory. Nothing is parsed yet -- just the bytes cached, keyed by URL.

**On click -- parse and swap**

```
preventDefault()                        stop the browser navigating
fire astro:before-preparation           fetch happens here via event.loader()
fetch(href) or cache hit                fetch new page HTML (or serve from prefetch cache)
DOMParser.parseFromString(html)         parse HTML into a Document
merge <head>                            deduplicate scripts and styles
fire astro:after-preparation            new document ready, transition about to start
pushState(url)                          update the URL bar
startViewTransition(() => {
  fire astro:before-swap                before DOM is replaced
  swap <body>                           swap page content
  fire astro:after-swap                 DOM live, animation still playing
})
........................................animation completes
........................................browser paints real DOM
fire astro:page-load                    painted and interactive
```

The parse is fast (microseconds) and happens only on click, not on hover. The prefetch on hover hides network latency so by click time the only work left is parse and swap.

**Why it needs to be on every page**

`ClientRouter` works as a click interceptor -- if the destination page doesn't have it, navigating away from that page falls back to a full reload. This is why `transitions={false}` on the home page breaks transitions in both directions.

**Scripts are not re-run on navigation**

`ClientRouter` deduplicates `<script>` tags by `src` or content when merging `<head>`. Scripts already on the page are skipped. This is why `astro:after-swap` and `astro:page-load` events exist -- they let you re-run logic (theme, analytics) that would normally run on page load.

**Lifecycle events**

| Event | When it fires | Example use cases |
|---|---|---|
| `astro:before-preparation` | Before `ClientRouter` fetches, parses, and merges the new page | Show a loading indicator, cancel in-flight requests, override the loader |
| `astro:after-preparation` | After preparation is done, just before the transition starts | Modify the parsed new document before it's swapped in |
| `astro:before-swap` | Before the DOM swap inside `startViewTransition()` | Read scroll position, copy state from old page before it's gone |
| `astro:after-swap` | After DOM is swapped, before browser paints | Re-apply theme, reset scroll, reinitialize syntax highlighting |
| `astro:page-load` | After page is painted and interactive | Analytics tracking, reinitialize third-party widgets, focus management |

---

### Scroll Jitter on Reload

When you scroll down a content page and reload, the top content flashes briefly before settling at the scrolled position.

**What causes it**

The browser renders the page from the top (scroll = 0) first, then restores the saved scroll position in a separate step. That gap between render and scroll jump is the flash.

**The obvious fix -- why it doesn't work**

Setting `history.scrollRestoration = 'manual'` in the `<head>` disables the browser's native scroll restoration. But `ClientRouter` does its own JavaScript-based scroll restoration, independent of the browser mechanism. Setting `manual` only disables the browser's half -- Astro still restores scroll via JS. The flash remains.

**The fix that works**

Hide the page immediately in the inline `<head>` script, then reveal it after `window.load`:

```js
document.documentElement.style.visibility = 'hidden'
window.addEventListener('load', () => {
  requestAnimationFrame(() => { document.documentElement.style.visibility = '' })
}, { once: true })
```

**When `window.load` fires**

`window.load` fires after everything on the page has finished loading -- HTML parsed, stylesheets applied, all images downloaded, all fonts fetched, all scripts executed. It is the last event in the page load sequence. By the time it fires, scroll restoration has already settled.

```
HTML parsed        →  DOMContentLoaded
images/fonts done  →  window.load          ← we reveal here
```

**How `requestAnimationFrame` works**

`requestAnimationFrame` schedules a callback to run just before the browser draws the next frame to the screen. It is the browser saying "I am about to paint -- do any last-minute changes now."

```
window.load fires
  → rAF callback queued
  → browser prepares next paint
  → rAF callback runs  →  visibility = ''
  → browser paints     →  user sees page at correct scroll position
```

The one `rAF` after `window.load` gives the browser one paint cycle to finalize scroll position before revealing the page.

**Why `visibility: hidden` and not `display: none`**

`display: none` removes the element from layout entirely, which breaks scroll calculations. `visibility: hidden` hides visually but keeps layout and scroll restoration working in the background.

---

### View Transitions

Traditionally, when content changes in the browser (like filtering a grid, opening a modal, or navigating to a new URL), the browser instantly repaints the screen.

The View Transitions API captures a visual snapshot of the old state, updates the DOM to the new state, captures a snapshot of the new state, and smoothly cross-fades or morphs matching elements between the two.

It works in two environments:

1. **Same-Document (SPAs)**: Triggered in JavaScript via document.startViewTransition(() => updateDOM()).
2. **Cross-Document (MPAs)**: Triggered automatically by full-page link navigations between same-origin HTML pages.

Before native view transitions, animating between two different states—especially between separate HTML pages—required fragile workarounds. Now instead of tracking coordinates, you give elements a unique identifier:

```css
/* Card on listing page */
.product-card-img {
  view-transition-name: product-hero;
}

/* Image on full details page */
.product-detail-img {
  view-transition-name: product-hero;
}
```

Because both elements share the same view-transition-name, the browser automatically computes the position, size, and aspect ratio differences, smoothly animating the card into the hero banner across pages without manual calculations.

Even if you don't define `view-transition-name` anywhere, the page still animates, but only as a full-page cross-fade. Because by default, browsers automatically assign a transition name to the root `<html>` element

```css
/* Applied automatically by user-agent stylesheet */
:root {
  view-transition-name: root;
}
```

Because :root always has a name, the browser captures two full-viewport snapshots:

1. Old state: The entire outgoing screen (::view-transition-old(root))
2. New state: The entire incoming screen (::view-transition-new(root))

It then performs a default cross-fade where the old page fades from opacity: 1 to 0, and the new page fades from opacity: 0 to 1 over roughly 0.25 seconds.

**How view transitions works in Astro**

When a link is clicked, `ClientRouter` wraps the DOM swap in `document.startViewTransition()`:

```js
// Simplified representation
document.startViewTransition(async () => {
  swapHead(currentDoc.head, nextDoc.head);
  swapBody(currentDoc.body, nextDoc.body);
});
```

`startViewTransition()` captures the old page, runs the callback (DOM swap), captures the new state, then hands control to CSS to animate between the two captures.

**`ClientRouter` does not depend on the View Transitions API**

They are independent. `ClientRouter` handles SPA routing (intercepts clicks, fetches pages, swaps DOM) regardless of View Transitions support. If the browser supports View Transitions API, it wraps the swap in `startViewTransition()` for the animation overlay. If not, it does the swap directly. Disabling View Transitions does not break SPA routing.

The core loop Astro ClientRouter adds:

```
hover  →  fetch() and cache HTML
click  →  preventDefault()
       →  parse cached HTML
       →  merge <head>
       →  startViewTransition(() => swap <body>)
       →  pushState(url)
       →  fire lifecycle events

```

**Disabling View Transitions entirely**

Three ways, depending on what you want to disable:

1. Disable animations only, keep SPA routing

```css
::view-transition-old(*),
::view-transition-new(*) {
  animation: none;
}
```

ClientRouter still works, captures still happen, pseudo-elements still created but DOM swaps instantly with no animation.

2. Keep SPA routing, kill animation + captures (zero overhead)

```js
document.addEventListener('astro:before-preparation', (e) => {
  e.viewTransition?.skipTransition()
})
```
No captures, no pseudo-elements, no animation. Just instant DOM swap with full SPA routing benefits.

3. Disable the View Transitions using `@view-transition` CSS

`@view-transition { navigation: auto }` is a declarative way to tell the browser to automatically wrap cross-document navigations (full page loads) in a View Transition -- without any JS.

```css
@view-transition { navigation: auto }  →  opts the PAGE in (root crossfade)
@view-transition { navigation: none }  →  opts the PAGE out (root crossfade)
view-transition-name: foo              →  opts an ELEMENT in (individual morph)
view-transition-name: none             →  opts an ELEMENT out entirely
```

But it has no effect when ClientRouter is used because ClientRouter does not depend on this CSS. It internally calls `document.startViewTransition()` directly from JS.

**The `transition:name` flash**

Elements with matching `transition:name` on both pages are pulled out of the normal page swap and given their own morph animation. Even with `animation: none`, the browser still composites them as separate layers, which can cause the element to briefly appear at its destination position before the swap settles. Fix: remove `transition:name` from both elements, or use `@view-transition { navigation: none; }`.

**The four independent knobs**

```
ClientRouter         →  controls routing (SPA vs full reload)
transition:animate   →  controls animation on a specific element
transition:name      →  links the same element across two pages for a morph
::view-transition CSS  →  controls the default page-level animation
```

### Dark Mode

Theme is controlled via a `dark` class on `<html>` and a `data-theme` attribute, driven by Tailwind's class-based dark mode.

**How it initialises**

An inline `<script is:inline>` in `<head>` inside `base.astro` runs synchronously before the browser paints anything. It reads the saved preference from `localStorage`, falling back to the OS preference via `prefers-color-scheme`. This prevents any flash of the wrong theme on load.

```js
const theme = localStorage.getItem("theme") ??
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
document.documentElement.classList.toggle("dark", theme === "dark")
```

Since view transitions skip a full page reload, the same `setTheme` function is re-run on every `astro:after-swap` event, which fires before the browser paints the new page.

**Toggle**

`theme-toggle.astro` is a plain Astro component (no React) with a click handler that toggles the `dark` class and saves the new preference to `localStorage`.

### Analytics

Page views are tracked with [Umami](https://umami.is/) with `data-auto-track="false"` to disable automatic tracking.

Manual tracking is done on `astro:page-load`, which fires on both the initial page load and after every view transition:

```js
document.addEventListener("astro:page-load", () => {
  window.umami?.track()
})
```

The umami script uses `defer` so it is guaranteed to be loaded before `astro:page-load` fires.

---

### Aside Layout

The page shell in `main.astro` renders two sibling elements inside a `flex justify-center` body: `<main>` for content and `<aside>` for the right panel. The aside is `hidden lg:flex` -- invisible on mobile, visible only on desktop. On mobile, navigation is rendered inline inside `<main>` with `lg:hidden`.

**Sticky behavior**

`main.astro` accepts a `stickyAside` prop (default `true`). When `true`, the aside gets `lg:sticky lg:self-start lg:top-8` and sticks to the top immediately on scroll -- this is the behavior for all non-blog pages.

Blog post pages pass `stickyAside={false}`, which lets the aside flow normally with the page. The TOC nav element inside it carries `sticky top-8` on its own. The result:

1. The nav links scroll off screen naturally
2. When the TOC reaches the top of the viewport it sticks there

**Named slot**

`main.astro` exposes a named slot `toc` inside the aside. Blog posts inject a `<TableOfContents>` component into it. All other pages leave it empty -- a named slot with no content renders nothing.

**Table of contents**

`table-of-contents.astro` receives the `headings` array returned by Astro's `render()` function. `render(post)` extracts all headings from Markdown at build time -- no parsing at runtime. Each heading has `depth`, `slug`, and `text`. The TOC filters to `h2` and `h3`, uses `h.slug` as the anchor `href` (Astro auto-generates matching `id` attributes on rendered headings), and indents `h3` entries by `0.75rem` via inline style.

The `headings` flow: `render(post)` in `[...slug].astro` → passed as prop to `BlogPost` → injected into the `toc` named slot → rendered inside the aside.

**Visibility on scroll**

The TOC starts `opacity-0` and fades in only when it has reached its sticky position at the top. A zero-height sentinel `div` is placed just above the TOC nav in the normal flow. An `IntersectionObserver` watches the sentinel:

- Sentinel visible (user hasn't scrolled far enough) → TOC is `opacity-0`
- Sentinel leaves the viewport (sticky has kicked in) → TOC becomes `opacity-100`

Scrolling back up reverses it. The `threshold: 0` setting fires as soon as even one pixel of the sentinel crosses the viewport edge.

---

## Astro Core Concepts

### Anatomy of an Astro Component

Every `.astro` file has up to four sections:

```astro
---
// 1. FRONTMATTER
// Runs at build time on the server (or at request time in SSR).
// Never reaches the browser.
// Use it for: imports, data fetching, props, computed values.
import { getPosts } from "~/utils"
const posts = await getPosts()
---

<!-- 2. TEMPLATE -->
<!-- HTML markup with JSX-like expressions. -->
<!-- Rendered to a static HTML string at build time. -->
<ul>
  {posts.map((post) => <li>{post.data.title}</li>)}
</ul>

<script>
  // 3. SCRIPT
  // Runs in the browser, not at build time.
  // Astro bundles, deduplicates, and hoists this to <head>.
  // Has no access to frontmatter variables (different runtime).
  document.addEventListener("astro:page-load", () => {
    console.log("page ready")
  })
</script>

<style>
  /* 4. STYLE */
  /* Scoped to this component by default -- Astro adds a unique */
  /* attribute (e.g. data-astro-cid-xyz) to both the elements  */
  /* and the selectors so styles don't leak out.               */
  /* Use :global() to break out of scope.                      */
  li { color: red; }  /* only affects <li> in this component */
</style>
```

**Key rules**

- One component per file -- no way to export multiple components from one `.astro` file.
- Frontmatter variables are not available in `<script>` -- they run at different times (build vs browser). Pass data via `data-*` attributes or inline JSON if needed.
- `<script>` and `<style>` blocks are extracted and handled by Astro's bundler -- they don't stay inline in the output HTML.
- Multiple `<script>` or `<style>` blocks in one file are allowed and merged.

### Islands Architecture

Every component is static HTML by default -- zero JS shipped to the browser. Components opt into JS with `client:*` directives (`client:load`, `client:idle`, `client:visible`). Everything else stays as plain HTML.

### ClientRouter

Astro's SPA router. Intercepts link clicks, fetches the next page's HTML, and swaps the DOM without a full reload. Prefetches on hover. See the detailed section above.

### View Transitions

Built on the browser's native View Transitions API (`document.startViewTransition()`). Animates between old and new page states. `transition:name` on matched elements creates shared element morphing animations. See the detailed section above.

### Content Collections

Astro's way of managing structured content (blog posts, docs). Schema defined with Zod, content lives in `src/content/`, queried with `getCollection()` with full type safety.

### SSG / SSR

Astro builds to static HTML by default (SSG) -- every page pre-rendered at build time, which is what GitHub Pages serves. Individual routes can opt into SSR for server-rendered dynamic pages.

### getStaticPaths

Required for any dynamic route (a file with `[param]` in the name) in SSG mode. Astro needs to know upfront which pages to generate, so `getStaticPaths` returns the full list.

```ts
export async function getStaticPaths() {
  const posts = await getPosts()
  const uniqueTags = [...new Set(posts.flatMap((post) => post.data.tags || []))]

  return uniqueTags.map((tag) => ({
    params: { tag },   // fills in [tag] in the URL
    props: { posts, tag },  // available inside the page component
  }))
}
```

Astro calls `getStaticPaths` once at build time. For each item in the returned array, it runs the page component once -- with `Astro.params` set to that item's `params` and `Astro.props` set to that item's `props`. Each run produces one static HTML file.

```
getStaticPaths() returns N items
         ↓
component runs N times (once per item)
         ↓
N HTML files written to disk
```

`params` fills the `[bracket]` in the filename and becomes the URL segment. `props` is just data -- anything you want available in the component without fetching again.

Without `getStaticPaths`, Astro does not know what values `[tag]` can take and will error at build time.

### The `Astro` Global

Everything Astro provides to a component via the `Astro` object:

| Property | What it is | SSG | SSR |
|---|---|---|---|
| `Astro.props` | Data passed from a parent component or from `getStaticPaths` | yes | yes |
| `Astro.params` | URL segments from the route filename -- `[tag]` → `{ tag: "astro" }` | yes | yes |
| `Astro.url` | Current page URL as a `URL` object -- use `.pathname`, `.searchParams` | yes | yes |
| `Astro.site` | The `site` value from `astro.config.mjs` | yes | yes |
| `Astro.slots` | Check if a named slot has content -- `Astro.slots.has("toc")` | yes | yes |
| `Astro.locals` | Data set by middleware, passed down to the page | yes | yes |
| `Astro.request` | The raw `Request` object | no | yes |
| `Astro.response` | Set response headers and status codes | no | yes |
| `Astro.cookies` | Read and write cookies | no | yes |
| `Astro.redirect()` | Return a redirect response | no | yes |

**`Astro.params` vs `Astro.props`**

```
Astro.params  -- set by Astro from the URL, reflects the [bracket] segments
Astro.props   -- set by you, via getStaticPaths props or a parent component
```

For `[tag].astro` visiting `/tags/astro`:
- `Astro.params` → `{ tag: "astro" }` -- always available, you didn't set it
- `Astro.props` → `{ tag: "astro", filteredPosts: [...] }` -- only what you returned from `getStaticPaths`

### Middleware

Runs on every request before the page renders. Used for auth, redirects, injecting data into `Astro.locals`. Only relevant in SSR mode.

### Image Optimization

Astro's `<Image />` component from `astro:assets` handles all optimization at build time. No runtime processing, no extra server.

**What it does at build time**

- Resizes to the rendered dimensions
- Converts to WebP (or AVIF, configurable)
- Generates a `srcset` for multiple pixel densities
- Injects explicit `width` and `height` to prevent layout shift
- Adds `loading="lazy"` and `decoding="async"` by default

**Globbing images with `import.meta.glob`**

The Carousel loads all photos from a folder at build time:

```ts
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  "../../assets/life/*.{jpg,jpeg,JPG,JPEG,png,gif}"
)
const images = await Promise.all(
  Object.values(imageModules).map((mod) => mod().then((m) => m.default))
)
```

`import.meta.glob` is a Vite feature Astro exposes. It returns a map of file path to a lazy import function. `Promise.all` resolves them into `ImageMetadata` objects -- width, height, src, format -- which `<Image />` uses to generate the optimized output.

**The `height` prop**

Passing `height={256}` tells Astro the rendered height. It calculates the corresponding width to preserve the aspect ratio and generates an image at exactly that size -- no oversized downloads.

**Right-click protection**

The Carousel sets `draggable={false}` and `oncontextmenu="return false"` on each `<Image />` to prevent saving via right-click or drag-to-desktop.

### Actions

Type-safe server functions callable from the client. Used for form submissions and mutations. Only available in SSR mode.

### Integrations

First-class plugins wired in via `astro.config.mjs` -- `@astrojs/react`, `@astrojs/tailwind`, `@astrojs/sitemap`, etc. This site uses React and Tailwind integrations.

### Prefetch

Built-in link prefetching controlled via `defaultStrategy` on `<ClientRouter />` or per-link with `data-astro-prefetch`. Strategies: `hover` (default), `viewport`, `idle`, `none`.

### Scoped Styles

`<style>` blocks inside `.astro` files are automatically scoped to that component -- no class name collisions. Use `:global()` to break out of scope when needed.

### Slots

Astro's equivalent of React children. `<slot />` in a layout renders whatever the parent passes between the component tags. Named slots (`<slot name="header" />`) allow multiple injection points.

**Default slot**

```astro
<!-- layout.astro -->
<div>
  <slot />
</div>

<!-- page.astro -->
<Layout>
  <p>This renders inside the slot</p>
</Layout>
```

**Named slots**

```astro
<!-- layout.astro -->
<aside>
  <slot name="toc" />
</aside>
<main>
  <slot />
</main>

<!-- page.astro -->
<Layout>
  <Nav slot="toc" />   <!-- goes into aside -->
  <Article />          <!-- goes into main (default slot) -->
</Layout>
```

An empty named slot renders nothing -- no wrapper element, no whitespace.

**Slots do not forward through multiple layers**

Content placed between `<BlogPost>` tags lands in `BlogPost`'s own `<slot />`, not in `MainLayout`'s named slots. This is why `headings` is passed as a prop to `BlogPost`, and `BlogPost` itself places `<TableOfContents slot="toc" />` directly inside `<MainLayout>` -- it owns that injection point and can reach the named slot one level up.

### Endpoints

Files in `src/pages/` that export `GET`, `POST` etc. instead of a component -- used to build API routes, RSS feeds, OG image generators. Your site uses this for `/rss.xml` and `/og/`.

### Props and Type Safety

Component props are typed via `interface Props` in the frontmatter. Astro infers and validates them at build time -- no runtime overhead.

### MDX

MDX is Markdown with JSX -- you write prose in Markdown syntax and can drop React (or any framework) components inline. Astro supports it via `@astrojs/mdx`.

```mdx
### My Heading

Some paragraph text here.

<MyComponent data={someData} client:load />

More prose after the component.
```

**When MDX is the right choice**

- Pages that are mostly *content* with occasional interactive components (blog posts, docs, tutorials)
- Non-developers need to edit the content -- `.mdx` is friendlier than `.astro` or JSX
- Many similar pages managed via content collections (e.g. every blog post is an `.mdx` file with frontmatter)

**When to skip MDX and use `.astro` instead**

- The page is mostly a *layout or component* with only a small amount of text
- The text is a few lines and lives in only one place -- inline it directly
- No non-developer authors and no frontmatter metadata needed

**The rough rule**

> If a page is mostly content with occasional components, use `.mdx`. If it is mostly a component with occasional text, use `.astro`.

---

### IntersectionObserver

A browser API that fires a callback whenever a target element enters or exits the viewport. No scroll event listeners, no `getBoundingClientRect()` in a loop -- the browser does the work natively and calls you only when something changes.

**Basic shape**

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    entry.isIntersecting   // true = visible, false = not
    entry.intersectionRatio  // 0.0–1.0, how much is visible
  })
}, options)

observer.observe(element)    // start watching
observer.unobserve(element)  // stop watching one
observer.disconnect()        // stop watching all
```

**Options**

```js
{
  root: null,           // null = viewport (default)
  rootMargin: "0px",    // expand/shrink the root box (like CSS margin)
  threshold: 0          // fire when ANY pixel crosses the edge
}
```

`rootMargin: "0px 0px -60% 0px"` shrinks the bottom of the detection zone by 60% -- useful for active-heading TOCs where you want a heading to register as active when it's in the top 40% of the screen, not just barely on screen.

**The sentinel pattern**

A zero-height invisible `div` is placed in the normal flow just above a sticky element. The observer watches the sentinel, not the sticky element itself:

```
┌─────────────────────────┐  ← viewport top
│   [sentinel div]        │  ← zero-height, in normal flow
│   [TOC nav, sticky]     │
└─────────────────────────┘
```

- Sentinel visible → sticky hasn't kicked in → hide TOC (`opacity-0`)
- Sentinel exits viewport → sticky is now active → show TOC (`opacity-100`)

The sentinel takes up no space and is invisible -- it exists purely as a scroll position marker.

---

## Astro vs Other Frameworks

**The core question each framework answers differently: "when does JS run?"**

**React** -- UI is JS, always. The entire page is a JS application. Even "static" content is rendered by JS in the browser (CSR) or hydrated from a server string (SSR). The component tree lives in memory at runtime. DOM = a side effect of state.

**Vue** -- same model, gentler DX. Same runtime component tree as React. Reactivity is built into the object system (`ref`, `reactive`) rather than hooks. Closer to the HTML mental model but fundamentally the same architecture.

**Solid** -- React's model, no virtual DOM. Signals compile to direct DOM updates. No diffing, no re-renders of the whole tree -- just the exact node that changed. Still ships a runtime, still owns the DOM. Fastest of the JS-runtime group.

**Svelte** -- compiles away the framework. No runtime shipped. Components compile to vanilla JS that manipulates the DOM directly. Closest to Astro's output, but still assumes the whole page is a Svelte app.

**Next.js** -- React on a server. SSR/SSG via React's own hydration -- the full React tree ships to the browser and re-hydrates. The server is a React concern, not a routing/content concern.

**Remix** -- server as the primary thing. Web fundamentals first (forms, fetch, HTTP). React is the view layer but the server owns data flow. Full page hydration still happens -- React still ships.

**Astro -- content is HTML, JS is optional per region**

Every other framework above starts from: *"the page is a component tree."*

Astro starts from: *"the page is HTML. Add JS only where the user needs to interact."*

```
React/Vue/Solid/Svelte/Next/Remix
  page = component tree → renders to HTML + hydrates back to component tree

Astro
  page = HTML → stays HTML
  interactive region = island → ships only that island's JS
```

Build-time values (a color map, a config object, a formatted date) are evaluated during `astro build`, written into the HTML, and thrown away -- they never reach the browser. React needs them at runtime to re-render. This is why Astro frontmatter code has zero cost in production.

**Why Astro chose this**

Most websites are 80% content (blogs, docs, marketing, portfolios) and 20% interactive (search, forms, carousels). Every framework before Astro was optimized for the 20% and made the 80% pay the cost. Astro flipped the default.

The tradeoff: if the whole page needs reactive state (a dashboard, a rich editor, a game), Astro's islands model is awkward -- Next or Remix would be a better fit. Astro wins when content is the primary thing and interactivity is the exception.

---

## Next.js vs Astro -- Mental Model

**Next.js: SSR on first load, SPA after**

The common description "Next.js is SSR" is misleading. It's more accurately: server-rendered HTML for the first request, then a React SPA for every navigation after.

```
Visit /blog          → server renders HTML → browser gets real content
Click /about         → React intercepts, fetches data, renders in browser
Click /contact       → same, pure client-side, no server HTML
```

The server HTML on the first load exists for two narrow reasons: perceived performance (user sees content before JS runs) and SEO/link previews (crawlers and bots don't run JS). After hydration, React owns the DOM and the server is mostly done.

```
CSR (no SSR)          SSR (Next.js)

0ms   blank screen    0ms   blank screen
800ms JS downloads    200ms HTML arrives → user sees content
1500ms React runs          ...
1500ms page visible   800ms JS downloads
1500ms interactive    1500ms React hydrates
                      1500ms interactive
```

Both become interactive at the same time. SSR just moves "visible" earlier -- the HTML is rendered twice (server + hydration) and the first copy is thrown away. This double work is called the **hydration tax**.

**The exception: React Server Components**

Next 13+ app router with RSC streams server-rendered output on every navigation, not just the first. That's a genuine architectural shift -- but the client React tree still hydrates and owns the DOM. The server is still doing React's work.

**Astro: no hydration tax**

Astro renders HTML at build time (SSG) or at request time (SSR), and that HTML is the final product. Nothing hydrates. The server's job is routing and content -- not running a component framework.

```
Next.js
  first visit  → server renders React → HTML → browser hydrates → React owns DOM
  navigation   → React SPA (client only)

Astro (SSG)
  build time   → renders all pages to HTML files
  any visit    → server sends the file, done
  navigation   → ClientRouter swaps HTML (no React, no hydration)
```

Astro's `ClientRouter` does SPA-style navigation too, but it swaps raw HTML fetched from static files -- not a React component tree re-rendering. Zero hydration cost on any page that has no interactive islands.

**Navigation model comparison**

```
old SSR navigation  →  destroy DOM → new HTML → re-hydrate everything
RSC navigation      →  diff Flight payload → patch only changed nodes
Astro navigation    →  fetch HTML → swap <body> → no reconciliation needed
```

Old SSR on navigation blows away and rebuilds the entire DOM. RSC is surgical -- the React tree stays alive and only changed nodes are patched, so shared layout and client state survive across navigations. Astro does the simplest thing: swap the body. No diffing, no reconciler, no persistent tree. Correct for content pages, where there is no state worth preserving across navigations.

**Why not just do a full reload instead of ClientRouter**

You can -- the web worked this way for 25 years and it is still correct. But a full reload has a cost even with caching:

```
full reload

click /about
  → browser sends request
  → server responds with HTML
  → browser destroys everything -- styles, scripts, DOM
  → re-parses HTML from scratch
  → re-evaluates all scripts (even cached ones)
  → re-runs all JS (theme toggle, analytics, widgets)
  → page paints
```

The browser goes white between navigations. On fast connections it is 100-300ms. On slow ones it is seconds. Scripts that were already running -- theme, analytics, third-party widgets -- all get torn down and re-initialized.

```
ClientRouter navigation

click /about
  → HTML already in memory (prefetched on hover)
  → swap only <body>, <head> stays intact
  → scripts not re-evaluated, theme stays applied
  → view transition animates old page out, new page in
  → no flash, effectively instant
```

What ClientRouter buys concretely:

- **No white flash** -- old page stays visible until new content is ready to paint
- **Scripts not re-run** -- theme, analytics, widgets stay initialized across navigations; `astro:after-swap` exists for the cases that do need to re-run
- **Prefetch on hover** -- by the time you click, the HTML is already in memory, so the swap costs nothing
- **View transitions** -- smooth animations between pages become possible because both old and new DOM exist briefly at the same time during the swap

ClientRouter is a UX polish layer, not a correctness requirement. Remove it and the site still works, just with visible page flashes between navigations.