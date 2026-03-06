## Social-share remediation & canonicalization (Netlify)

Summary
-------
This document explains the recent fix that restores rich LinkedIn / Facebook share previews and the long-term, reusable canonical pattern we recommend for social/OG endpoints across the application.

Problem (root cause)
--------------------
- Historically the app exposed a "pretty" path at `/functions/v1/social-share` which was routed to different runtimes (a Supabase edge function or a Netlify function via a proxy). That created two problems:
  - Scrapers (LinkedIn, Facebook, etc.) sometimes hit a stale Supabase endpoint or a flaky proxy route and got either generic page HTML or no OG tags.
  - Built frontend assets (minified `dist/` bundles) still contained hard-coded references to the pretty path, so share dialogs kept producing broken/old URLs until the frontend was rebuilt and redeployed.

Fix applied (what changed)
-------------------------
All changes were *source-only* (no runtime behavior was removed):

- The canonical runtime for social/OG pages is now the Netlify Function at `/.netlify/functions/social-share`.
- Source helpers in `src/commonApp/functions/*` and the Share UI (`src/components/ShareMenu.tsx`) were updated to build share links that target the Netlify function path directly.
- The Netlify function `netlify/functions/social-share.cjs` was updated to:
  - Render full OG HTML for bot user-agents (LinkedInBot / FacebookBot / twitterbot / curl, etc.).
  - Apply browser 302 redirects for normal browsers to a search result (`/search?q=...`).
  - Emit `og:title`, `og:description`, `og:image`, `og:url` and `link rel="canonical"` in the HTML head.
- The Netlify edge proxy file `netlify/edge-functions/social-share-proxy.js` was updated to forward to the Netlify function if the pretty path is requested.
- The frontend was rebuilt so `dist/` no longer contains references to the old pretty path (and the built Share menu now points at `/.netlify/functions/social-share`).
- Changes were committed and pushed to `main` so Netlify CI will build & deploy the site.

Why this fixes the problem
--------------------------
- Directly targeting the Netlify function removes the uncertain routing step (proxy → Supabase vs Netlify). Scrapers now see the canonical OG HTML immediately from Netlify.
- Rebuilding `dist/` ensures the share links emitted by the client are correct and consistent across platforms.

Canonical pattern (recommended for other app functions)
-----------------------------------------------------
Use this pattern when you expose small share / preview / bot-facing pages via serverless functions:

1. Single canonical function per feature.
   - Host the function on the canonical runtime (for us: Netlify Functions `/.netlify/functions/<name>`).

2. Function behavior split (bots vs browsers):
   - If the request is from a known crawler or the Accept header indicates a non-HTML client, return a full HTML page with OG tags (200). This page must contain:
     - `og:title`, `og:description`, `og:image`, `og:image:alt`, `og:image:width/height` when available.
     - `og:url` — choose whether it points to the share function URL or the final landing page (see note below).
     - `link rel="canonical"` matching `og:url`.
   - If the request is from a normal browser (User-Agent contains `Mozilla` and accepts `text/html`), respond with a 302 redirect to the user-facing SPA route (for example `/search?q=...`) so the user lands in the interactive app.

3. Share URL construction in the client
   - Client code should build share links using the canonical function path (e.g. `https://curiosai.com/.netlify/functions/social-share?query=...`).
   - Keep share helper utilities in `src/commonApp/functions/*` so other UI components reuse the logic.

4. Cache and headers
   - For bot responses, add short public caching (e.g., `Cache-Control: public, max-age=300`) to reduce load but allow quick updates.
   - For 302 browser redirects, use `Cache-Control: no-cache, no-store, must-revalidate` to avoid stale redirects.

5. Vanity route (optional)
   - If you want a pretty path (`/functions/v1/social-share`) for legacy or marketing reasons, keep a single redirect/route mapping in `netlify.toml` or `public/_redirects` that points to the canonical Netlify function. Example (Netlify `_redirects`):

  /functions/v1/social-share /.netlify/functions/social-share 200

  This is only a convenience layer. The code and share links should prefer the direct function path.

6. CI / Deploy considerations
   - Always rebuild the frontend (`npm run build`) after changing share helper logic. Built assets are what end-users and scrapers will use when sharing.
   - Prefer Netlify CI to build from source on push instead of committing `dist/` artifacts unless your pipeline requires committed builds.

7. Monitoring & cleanup
   - Remove or archive older runtime deployments (e.g., Supabase functions) once Netlify is canonical to prevent scrapers from accidentally hitting stale endpoints.
   - Monitor Netlify function logs for errors and 4xx/5xx responses from crawlers.

Notes and trade-offs
--------------------
- og:url: current behavior sets `og:url` to the SPA search route (for example, `https://curiosai.com/search?q=...`). This makes the shared link click-through land directly in the SPA search page. If you prefer that scrapers show the share function URL (so clicks first hit the function page and then redirect), change the function to set `og:url` to the share function URL instead. Both are valid — choose based on whether you prefer the crawler to index the SPA route or the function endpoint.

- Vanity route: keeping `/functions/v1/social-share` as a redirected vanity path is fine, but it must not be a live, separate implementation. Only one runtime must answer requests for that logical endpoint to avoid flapping/caching problems.

Verification commands (quick checks)
----------------------------------
- Verify function returns OG HTML (as LinkedIn):

  curl -s -A "LinkedInBot/1.0" "https://curiosai.com/.netlify/functions/social-share?query=verify" | grep -E "og:title|og:description|og:image|og:url"

- Check pretty path (if vanity route kept) to ensure it proxies to Netlify:

  curl -s -I -A "LinkedInBot/1.0" "https://curiosai.com/functions/v1/social-share?query=verify" | head -n 20

- Use social debug tools to force re-scrape:
  - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/  (enter the share URL and Inspect)
  - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/

Migration checklist (practical steps to apply to other functions)
-----------------------------------------------------------------
1. Copy the share-template pattern from `netlify/functions/social-share.cjs` to a new function file for the feature.
2. Add client share helper in `src/commonApp/functions/` and import it from UI components.
3. Rebuild frontend and verify `dist/` references the canonical function path.
4. Add a short Smoke test (curl bot UA) to CI that validates OG tags are present after deploy.
5. Remove legacy runtime(s) from other providers and update docs.

Final notes
-----------
This change restores stable, predictable social previews by removing an ambiguous proxy/runtime layer and making Netlify the canonical function runtime. The recommended pattern is intentionally simple, robust, and easy to replicate for other share/preview functions in the app.

If you'd like, I can now:
- Update the docs that still reference `/functions/v1/social-share` to prefer the Netlify path (I can prepare a patch). 
- Add a short CI smoke test (a curl-based check) that runs after Netlify deploy to catch regressions.

Choose the next action and I will implement it (I will not change function code unless you ask).
