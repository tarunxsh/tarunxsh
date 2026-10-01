## Hi there ~ <img src="https://user-images.githubusercontent.com/1303154/88677602-1635ba80-d120-11ea-84d8-d263ba5fc3c0.gif" width="24px" alt="hi">

This is built with [Astro](https://astro.build) and deployed to [GitHub Pages](http://pages.github.com/)

---

## How things are working here

### ClientRouter

`ClientRouter` is Astro's SPA router. Placing `<ClientRouter />` in `<head>` injects a small script that intercepts all link clicks on the page. It requires no route map or config -- it simply reads the `href` of whatever `<a>` was clicked and handles the navigation itself.

**On hover -- prefetch**

The moment the cursor touches a link, the script fires a `fetch()` for that URL and stores the raw HTML string in memory. Nothing is parsed yet -- just the bytes cached, keyed by URL.

**On click -- parse and swap**

```
preventDefault()                        stop the browser navigating
DOMParser.parseFromString(html)         parse the cached HTML into a Document
merge <head>                            deduplicate scripts and styles
document.startViewTransition(() => {
  replace <body>                        swap page content
})
pushState(url)                          update the URL bar
fire astro:after-swap                   DOM live, not yet painted
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
| `astro:before-fetch` | Before `ClientRouter` fetches the next page's HTML | Show a loading indicator, cancel in-flight requests |
| `astro:after-fetch` | After the fetch completes, before any DOM changes | Hide loading indicator, inspect raw HTML before swap |
| `astro:before-preparation` | Before `ClientRouter` starts parsing and diffing | Log navigation start, capture current page state |
| `astro:after-preparation` | After preparation is done, just before the transition starts | Modify the parsed new document before it's swapped in |
| `astro:before-swap` | Before the DOM swap inside `startViewTransition()` | Read scroll position, copy state from old page before it's gone |
| `astro:after-swap` | After DOM is swapped, before browser paints | Re-apply theme, reset scroll, reinitialize syntax highlighting |
| `astro:page-load` | After page is painted and interactive | Analytics tracking, reinitialize third-party widgets, focus management |

---

### View Transitions

This site uses [Astro's View Transitions](https://docs.astro.build/en/guides/view-transitions/) for smooth SPA-like navigation without a full page reload.

`ClientRouter` is loaded in `base.astro` and enabled on all pages. When a user navigates between pages, Astro intercepts the link click, fetches the next page, and swaps the content in place.

**Shared element transition**

The post title animates between the post list and the post detail page using `transition:name`:

- `post.astro` -- post title in the list gets `transition:name="post-title-{id}"`
- `blog-post.astro` -- post title in the detail page gets the same name

Astro matches these by name and morphs the element across the navigation.

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

## Astro Core Concepts

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

### Middleware

Runs on every request before the page renders. Used for auth, redirects, injecting data into `Astro.locals`. Only relevant in SSR mode.

### Image Optimization

`<Image />` component that resizes, converts to WebP, and lazy loads images at build time. Zero config.

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

### Endpoints

Files in `src/pages/` that export `GET`, `POST` etc. instead of a component -- used to build API routes, RSS feeds, OG image generators. Your site uses this for `/rss.xml` and `/og/`.

### Props and Type Safety

Component props are typed via `interface Props` in the frontmatter. Astro infers and validates them at build time -- no runtime overhead.