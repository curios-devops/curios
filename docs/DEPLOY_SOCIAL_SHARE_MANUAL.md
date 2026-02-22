# social-share: deployment & verification (Netlify is canonical)

This repository historically included two implementations of the social-share endpoint: a Netlify function (canonical) and a Supabase Edge Function (deprecated). The Supabase implementation has been removed from active deployment and replaced with a lightweight 410 placeholder in the repository to avoid accidental scraping of stale content.

Additionally, the Supabase `social-og-image` function has been removed from the repository and from local deploy config — OG image generation now relies on other assets or Netlify-handled endpoints. This document explains the recommended flow and quick verification steps.

## Key points

- The Netlify function at `netlify/functions/social-share.cjs` is the canonical implementation and must remain deployed to Netlify.
- The repository previously included `supabase/functions/social-share/index.ts` (now removed) and `supabase/functions/social-og-image/index.ts` (now removed). These Supabase functions are deprecated and should not be deployed.
- If you rely on OG images, ensure your system points to the static fallback at `public/curiosai-og-image-1200x627.png` or to the Netlify function that produces OG HTML; the Supabase OG image function is no longer present.

---

## Deploying the Netlify social-share function

Netlify will automatically build and deploy functions from the repository when you push to the branch connected to your site (or use the Netlify dashboard). There is no special Supabase step required for the canonical social-share endpoint.

If you need to deploy manually via the Netlify dashboard:

1. Open your site in Netlify.
2. Go to Site settings → Functions (or the new functions UI).
3. Confirm that `social-share` exists and is set to run on Node (or CJS) as configured by the repo build.
4. Deploy the site (trigger a new site deploy) or push a commit that touches the function file.

Local dev: `npm run dev` will start the local Vite/Netlify dev environment used by this repo. The local dev server maps the Netlify function at:

- Local (dev): `http://localhost:8888/.netlify/functions/social-share?query=...`

(Your local port may vary depending on `netlify dev`/`npm run dev` config.)

---

## Why we removed the Supabase social-share and social-og-image

Having the same endpoint deployed in two places caused inconsistent scraper behaviour (CDN/proxy rewrites and stale Supabase deployment caused platforms like LinkedIn to fetch the wrong OG HTML). To prevent future regressions we:

- Made Netlify the canonical runtime for social-share.
- Removed the Supabase `social-share` and `social-og-image` function sources from the repository.
- Removed `social-share` and `social-og-image` from local deploy scripts and local Supabase config so they are not accidentally deployed.

If you maintain Supabase production deployments manually, ensure any hosted Supabase functions for `social-share` or `social-og-image` are removed there as well (dashboard or CI).

---

## Verification steps (recommended)

1. Verify Netlify function returns OG HTML when requested as a bot:

   - Direct Netlify function path (canonical):

     curl -I 'https://curiosai.com/.netlify/functions/social-share?query=test'

     Expect: `content-type: text/html; charset=utf-8` and a 200 response when using a bot UA.

2. Verify the proxied path (site path) returns the correct OG HTML for scrapers:

   - Proxy path used by frontend and social platforms:

     curl -I 'https://curiosai.com/functions/v1/social-share?query=test' -A "LinkedInBot/1.0"

     Expect: `content-type: text/html; charset=utf-8` and the `og:url` meta pointing to `https://curiosai.com/search?q=test`.

3. Confirm browsers still redirect to the search results (users should be routed to the live search rather than staying on the OG page):

   - In a normal browser user-agent the endpoint should respond with a 302 redirect to the search page.

4. Use LinkedIn Post Inspector to force LinkedIn to re-scrape (helpful for testing after changes):

   - https://www.linkedin.com/post-inspector/
   - Paste: `https://curiosai.com/functions/v1/social-share?query=unique-test-123` and click Inspect.

5. If you see stale content from a Supabase URL (`gpfccicfqynahflehpqo.supabase.co/functions/v1/social-share`), ensure the Supabase deployment has been updated or removed in the Supabase dashboard.

---

## Commands you may find useful

Trigger a Netlify site deploy (via git push):

```bash
# from repo root
git add netlify/functions/social-share.cjs
git commit -m "Update social-share Netlify function"
git push origin main
```

Quick local test using Netlify dev (if you have Netlify CLI set up):

```bash
# Start local dev (project configured with netlify dev or npm run dev)
npm run dev
# In another terminal, test the local function
curl -s 'http://localhost:8888/.netlify/functions/social-share?query=test' | head -n 30
```

---

## Notes and next steps

- If you rely on CI that deploys Supabase functions, ensure it no longer targets `social-share` or `social-og-image` (we updated `scripts/fresh-start.sh` and `supabase/config.toml` in the repo to reflect this).
- If you'd like, I can update other docs that reference `social-og-image` (e.g., `docs/LINKEDIN_SHARING_COMPLETE.md` and `docs/deployment/DEPLOY.md`) to avoid stale instructions. Tell me which you'd prefer.

---

Last updated: consolidated Feb 22, 2026
