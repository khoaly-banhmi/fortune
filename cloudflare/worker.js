/**
 * Serves the GitHub Pages project site (khoaly-banhmi/fortune) at https://khoaly.xyz/fortune/
 * while the rest of khoaly.xyz stays on Bearblog.
 *
 * Bind this Worker ONLY to these two routes (see wrangler.toml):
 *   khoaly.xyz/fortune
 *   khoaly.xyz/fortune/*
 * Do not use a wildcard like khoaly.xyz/fortune* — it would also catch blog posts such as /fortune-cookies/.
 * Anything that still reaches the Worker outside /fortune is passed straight through to the origin (Bearblog).
 *
 * The Pages site lives at the same path upstream (khoaly-banhmi.github.io/fortune/...), so no path rewriting
 * is needed, and the site itself uses relative URLs. Leave the repo's GitHub Pages "custom domain" EMPTY,
 * otherwise GitHub redirects the upstream request to that domain.
 */

const UPSTREAM_ORIGIN = 'https://khoaly-banhmi.github.io';
const BASE = '/fortune';

// Only these request headers are forwarded to GitHub. Cookies and Authorization (e.g. from the blog)
// are deliberately NOT sent to a third party.
const FORWARD_HEADERS = ['accept', 'accept-language', 'if-none-match', 'if-modified-since', 'range', 'user-agent'];

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Not ours: hand the request to the origin (Bearblog) untouched.
    if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) {
      return fetch(request);
    }

    // The site uses relative paths, so it must be served from /fortune/ (with the slash).
    if (url.pathname === BASE) {
      url.pathname = `${BASE}/`;
      return Response.redirect(url.toString(), 301);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    const upstreamUrl = new URL(url.pathname + url.search, UPSTREAM_ORIGIN);
    const headers = new Headers();
    for (const name of FORWARD_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    const upstream = await fetch(upstreamUrl, { method: request.method, headers, redirect: 'manual' });

    const out = new Response(upstream.body, upstream); // copy so the headers are mutable
    out.headers.delete('set-cookie');

    // If GitHub redirects within its own site, keep the visitor on khoaly.xyz.
    const location = upstream.headers.get('location');
    if (location) {
      const target = new URL(location, upstreamUrl);
      if (target.origin === UPSTREAM_ORIGIN) {
        target.protocol = url.protocol;
        target.host = url.host;
        out.headers.set('location', target.toString());
      }
    }
    return out;
  },
};
