// social-share — Supabase edge replica of netlify/functions/social-share.cjs.
// Serves Open Graph / Twitter Card HTML to social crawlers and 302-redirects
// humans to the Fast Search results page. Fronted by a curiosai.com proxy
// (/api/social-share) so LinkedIn sees a brand domain, not *.supabase.co.
//
// Public function: requires `verify_jwt = false` in supabase/config.toml so
// crawlers (which can't send auth) can fetch it.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Canonical brand path (the Netlify proxy in front of this function).
const BRAND_BASE = "https://curiosai.com/api/social-share";
const HUMAN_BASE = "https://curiosai.com/fast-search";

const DEFAULT_TITLE = "CuriosAI - AI-Powered Search";
const DEFAULT_DESCRIPTION =
  "Get comprehensive AI-powered search results with insights, analysis, and curated information from multiple sources.";
const FALLBACK_IMAGE = "https://curiosai.com/curios-og-image-1200x627.png";
const BOT_REGEX =
  /linkedinbot|facebookexternalhit|facebookbot|twitterbot|whatsapp|whatsappbot|slackbot|telegrambot|bot|crawler|spider|facebot|postman|curl|wget/i;

const escapeHtml = (text = ""): string =>
  text.replace(/[<>&"']/g, (char) =>
    ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&#39;",
    }[char] || char)
  );

const buildTitle = (query: string): string => {
  const trimmed = (query || "").trim() || DEFAULT_TITLE;
  let safe = escapeHtml(trimmed.slice(0, 100));
  if (trimmed.length > 100) safe += "…";
  return safe;
};

const buildDescription = (query: string, snippet: string): string => {
  const targetMax = 200;
  const minIdeal = 70;
  const q = (query || "").trim();
  const s = (snippet || "").trim();

  const firstSentence = s.split(/[.!?]+/).map((t) => t.trim()).filter(Boolean)[0] || "";
  let desc = firstSentence || s || DEFAULT_DESCRIPTION;

  if (desc.length > targetMax) desc = desc.slice(0, 197) + "…";

  if (!firstSentence && !s) {
    desc = q.slice(0, Math.min(120, q.length)) || DEFAULT_DESCRIPTION;
    if (q.length > desc.length) desc += "…";
  }

  if (desc.length < minIdeal) {
    const add = " Discover insights with CuriosAI";
    if (desc.length + add.length <= targetMax) desc += add;
  }

  return escapeHtml(desc);
};

interface ShareHtmlArgs {
  title: string;
  description: string;
  ogImage: string;
  imageWidth: string;
  imageHeight: string;
  shareUrl: string;
  query: string;
}

const buildShareHtml = ({
  title,
  description,
  ogImage,
  imageWidth,
  imageHeight,
  shareUrl,
  query,
}: ShareHtmlArgs): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="title" property="og:title" content="${title}" />
  <meta name="description" property="og:description" content="${description}" />
  <meta name="image" property="og:image" content="${ogImage}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:secure_url" content="${ogImage}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="CuriosAI preview image for: ${title}" />
  <meta property="og:image:width" content="${imageWidth}" />
  <meta property="og:image:height" content="${imageHeight}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CuriosAI" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="canonical" href="${shareUrl}" />
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
    <h1 style="color: #0095FF; margin-bottom: 20px;">CuriosAI</h1>
    <h2 style="color: #333; margin-bottom: 16px;">${title}</h2>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">${description}</p>
    <a href="${HUMAN_BASE}?q=${encodeURIComponent(query)}" style="background: #0095FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">Explore More with CuriosAI</a>
  </div>
</body>
</html>`;

serve((req: Request): Response => {
  const url = new URL(req.url);
  const params = url.searchParams;
  const query = params.get("query") || DEFAULT_TITLE;
  const snippet = params.get("snippet") || DEFAULT_DESCRIPTION;
  const image = params.get("image") || "";

  const userAgent = req.headers.get("user-agent") || "";
  const acceptHeader = req.headers.get("accept") || "";
  const isBot =
    BOT_REGEX.test(userAgent) ||
    userAgent === "" ||
    (acceptHeader && !acceptHeader.includes("text/html"));

  const title = buildTitle(query);
  const description = buildDescription(query, snippet);
  const ogImage = image && image.startsWith("http") ? image : FALLBACK_IMAGE;

  // Canonical URL stays on the brand domain (the curiosai.com proxy path).
  const shareUrl = `${BRAND_BASE}?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(
    snippet,
  )}${image ? `&image=${encodeURIComponent(image)}` : ""}`;

  // Humans get redirected to the actual Fast Search results page.
  if (!isBot && userAgent.includes("Mozilla") && acceptHeader.includes("text/html")) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${HUMAN_BASE}?q=${encodeURIComponent(query)}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  return new Response(
    buildShareHtml({
      title,
      description,
      ogImage,
      imageWidth: "1200",
      imageHeight: "627",
      shareUrl,
      query,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
});
