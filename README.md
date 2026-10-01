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
scripts/              set-site-url.sh, make-og.sh, new-key.py
```

## Deploy

1. Push this folder to a GitHub repo, then Settings → Pages → deploy from the branch root.
2. Link previews already point at `https://fortune.khoaly.xyz/`. If the domain ever changes, run `scripts/set-site-url.sh <new-url>` after resetting the URLs in `index.html` by hand (the script only replaces the `__SITE_URL__` placeholder).
3. Test locally with any static server (the page `fetch`es the SVGs and JSON, so `file://` won't work):
   ```bash
   python3 -m http.server 8123
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
