# Fortune Cookie

A single-page fortune cookie for GitHub Pages. Click the cookie, 8 SVG frames play, the slip rotates to horizontal and the fortune is written on it. Click again to reset. Every opened fortune has its own link (`?c=<key>`), so a shared link reopens the same cookie.

```
index.html            page + Open Graph tags
css/style.css         layout, Fraunces @font-face, slip animation
js/app.js             load frames, random pick, open/reset, URL key, share, mailto form
data/messages.json    [{ "id": "<random key>", "text": "<fortune>" }, ...]
assets/cookie/        frame-01..08.svg (your art, C2PA metadata stripped)
assets/og-image.png   1200x630 link preview (opened cookie, blank slip)
fonts/                Fraunces (latin, upright + italic), self-hosted
cloudflare/           worker.js + wrangler.toml: serves this site at khoaly.xyz/fortune/
scripts/              make-og.sh, make-icons.sh, new-key.py
```

## Deploy

1. Push to `khoaly-banhmi/fortune` and enable Pages (Settings → Pages → deploy from `main`, `/ (root)`). Leave the **custom domain empty**: the project page lives at `https://khoaly-banhmi.github.io/fortune/` and the Cloudflare Worker in `cloudflare/` serves it publicly at **https://khoaly.xyz/fortune/** (see below).
2. Everything in the page uses **relative paths**, so it works under `/fortune/` as long as the address ends with a slash. `/fortune` should redirect to `/fortune/`. The absolute URLs for link previews (`canonical`, `og:url`, `og:image`, `twitter:image` in `index.html`) point at `https://khoaly.xyz/fortune/`; change those four if the address ever moves.
3. Test locally with any static server (the page `fetch`es the SVGs and JSON, so `file://` won't work):
   ```bash
   python3 -m http.server 8123
   ```

## Cloudflare Worker (khoaly.xyz/fortune/ next to the Bearblog)

`khoaly.xyz` is a Bearblog; this site is a GitHub Pages project site. `cloudflare/worker.js` proxies `/fortune/*` to `khoaly-banhmi.github.io/fortune/*` and nothing else. It is bound to exactly two routes, `khoaly.xyz/fortune` and `khoaly.xyz/fortune/*`, so the blog's own traffic never goes through it. It also redirects `/fortune` to `/fortune/`, allows only GET/HEAD, and never forwards cookies or auth headers to GitHub.

**One-time setup**
1. **DNS:** in Cloudflare, the `khoaly.xyz` record that points at Bearblog must be **proxied (orange cloud)**, otherwise Worker routes don't run. Set SSL/TLS to **Full** (not Flexible, which causes redirect loops). Afterwards, load the blog and check it still works.
2. **Deploy:** `cd cloudflare && npx wrangler deploy` (routes come from `wrangler.toml`). Or in the dashboard: Workers & Pages → Create → paste `worker.js` → Settings → Triggers → add the same two routes.
3. **Don't** create a Bearblog post or page with the slug `fortune`; the Worker would shadow it.
4. Optional: delete the old `fortune.khoaly.xyz` DNS record.

**Check it**
```bash
curl -sI https://khoaly.xyz/fortune        # 301 -> /fortune/
curl -sI https://khoaly.xyz/fortune/       # 200, served by GitHub Pages
curl -sI https://khoaly.xyz/               # 200, the blog, unchanged
```

## Adding fortunes

Append to `data/messages.json` with a fresh random key (`python3 scripts/new-key.py`).

- **Never change or reuse an existing `id`.** Shared links point at it.
- **Max 80 characters.** The text is fitted to the slip, at most 3 lines, font-size shrinking from 22 to 10 units. 80 characters fits on 3 lines, and anything longer is cut off at 3 lines.
- Plain text only.

## Notes

- **URL format:** `?c=` query string, because GitHub Pages is static and this avoids the 404-redirect trick that breaks link previews. A removed or unknown key is ignored and the URL is cleaned.
- **Link previews:** crawlers don't run JavaScript, so every shared link shows the same blank-cookie preview image (by design). The fortune is revealed only after opening.
- **Font:** Fraunces is served from `/fonts`. There are no requests to Google, so cookie or tracker blockers have nothing to block.
- **"Add a fortune" form:** builds a `mailto:hello@khoaly.xyz` link, so it opens the visitor's mail app. It doesn't send from the page, and visitors without a mail client see the address as a fallback. To send from the page instead, swap the `mailto` block in `js/app.js` for a `fetch` to a form service (Web3Forms/Formspree).
- **One crack a day:** the visitor's browser remembers today's date (their local day) and fortune in `localStorage` (`fortune:daily`). Reloading or revisiting the same day shows that same fortune, and clicking it does nothing until local midnight. A shared `?c=` link shows that fortune without using up the visitor's own crack. It's a soft limit: clearing site data, a private window, or another device gives a new crack. To test as a new day, delete the `fortune:daily` key in devtools → Storage.
- **Slip angle/size:** `PAPER` and `TEXT_FILL` at the top of `js/app.js`. `-39` undoes the strip's diagonal tilt in frame 8.
- **Accessibility:** the cookie is a real `<button>`, the fortune is mirrored into an `aria-live` region, and `prefers-reduced-motion` skips the animation.
