// deno-lint-ignore-file no-import-prefix
// Shared Vertex AI auth for edge functions. Mints a Google OAuth access token from the
// service-account secrets (VERTEX_AI_SERVICE_ACCOUNT_EMAIL / VERTEX_AI_PRIVATE_KEY) — the
// same credentials veo-generate-video uses. Billed via the curios-vertex project, so it is
// NOT subject to the AI-Studio free-tier limits or the leaked API-key block.

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
export const VERTEX_PROJECT = Deno.env.get("VERTEX_AI_PROJECT") || "curios-vertex";
// @ts-ignore
export const VERTEX_LOCATION = Deno.env.get("VERTEX_AI_LOCATION") || "us-central1";

// @ts-ignore
const SERVICE_ACCOUNT_EMAIL = Deno.env.get("VERTEX_AI_SERVICE_ACCOUNT_EMAIL");
// @ts-ignore
const SERVICE_ACCOUNT_PRIVATE_KEY = Deno.env.get("VERTEX_AI_PRIVATE_KEY");

function b64url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJWT(): Promise<string> {
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Vertex service account not configured (VERTEX_AI_SERVICE_ACCOUNT_EMAIL / VERTEX_AI_PRIVATE_KEY)");
  }

  const now = Math.floor(Date.now() / 1000);
  const headerB64 = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimB64 = b64url(
    JSON.stringify({
      iss: SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const signatureInput = `${headerB64}.${claimB64}`;

  const pem = SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
  const pemContents = pem
    .substring(pem.indexOf("-----BEGIN PRIVATE KEY-----") + 27, pem.indexOf("-----END PRIVATE KEY-----"))
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signatureInput),
  );
  const signatureB64 = b64url(String.fromCharCode(...new Uint8Array(signature)));
  return `${signatureInput}.${signatureB64}`;
}

export async function getVertexAccessToken(): Promise<string> {
  const jwt = await createJWT();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get Vertex access token: ${await response.text()}`);
  }
  const data = await response.json();
  return data.access_token;
}

function vertexHost(location: string): string {
  return location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
}

/** Base URL for a publisher model on the Vertex AI endpoint (`:generateContent`, `:predict…`). */
export function vertexModelUrl(model: string, location: string = VERTEX_LOCATION): string {
  return `https://${vertexHost(location)}/v1/projects/${VERTEX_PROJECT}/locations/${location}/publishers/google/models/${model}`;
}

/** Vertex Interactions API endpoint (used by Gemini Omni Flash for video generation/editing). */
export function vertexInteractionsUrl(location: string = VERTEX_LOCATION): string {
  return `https://${vertexHost(location)}/v1beta1/projects/${VERTEX_PROJECT}/locations/${location}/interactions`;
}
