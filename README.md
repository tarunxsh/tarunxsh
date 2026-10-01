## Hi there ~ <img src="https://user-images.githubusercontent.com/1303154/88677602-1635ba80-d120-11ea-84d8-d263ba5fc3c0.gif" width="24px" alt="hi">

This is built with [Astro](https://astro.build) and deployed to [GitHub Pages](http://pages.github.com/)

---

## How things are working here

### View Transitions

This site uses [Astro's View Transitions](https://docs.astro.build/en/guides/view-transitions/) for smooth SPA-like navigation without a full page reload.

`ClientRouter` is loaded in `base.astro` and enabled on all pages except the home page. When a user navigates between pages, Astro intercepts the link click, fetches the next page, and swaps the content in place.

Since `ClientRouter` must be present on both the source and destination page for a transition to work, the home page being opted out affects navigation in both directions:

- Home to any page: full reload (home has `transitions={false}`)
- Any page to home: full reload (home has no `ClientRouter`)
- Any page to any page: view transition

**Shared element transition**

The post title animates between the post list and the post detail page using `transition:name`:

- `post.astro` -- post title in the list gets `transition:name="post-title-{id}"`
- `blog-post.astro` -- post title in the detail page gets the same name

Astro matches these by name and morphs the element across the navigation.

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