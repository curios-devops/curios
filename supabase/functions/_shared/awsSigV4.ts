// deno-lint-ignore-file no-import-prefix
// AWS Signature Version 4 signer for Amazon's Product Advertising API (PA-API 5.0).
// PA-API requests must be signed with SigV4 scoped to the "ProductAdvertisingAPI"
// service — this is the same algorithm AWS SDKs use, implemented directly against
// Deno's Web Crypto (no aws-sdk dependency, mirrors _shared/vertex.ts's JWT signing
// style: minimal, self-contained crypto for one specific request shape).

const encoder = new TextEncoder();

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(message));
  return toHex(digest);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

function amzDateNow(): { amzDate: string; dateStamp: string } {
  const iso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

export interface PaapiSignedRequest {
  url: string;
  headers: Record<string, string>;
}

/**
 * Sign a PA-API 5.0 POST request (SearchItems, GetItems, ...). `path` is the API
 * path (e.g. "/paapi5/searchitems"), `target` the x-amz-target header value.
 */
export async function signPaapiRequest(params: {
  accessKey: string;
  secretKey: string;
  region: string;
  host: string;
  path: string;
  target: string;
  body: string;
}): Promise<PaapiSignedRequest> {
  const { accessKey, secretKey, region, host, path, target, body } = params;
  const { amzDate, dateStamp } = amzDateNow();
  const service = 'ProductAdvertisingAPI';

  const signedHeaderNames = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=UTF-8\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;

  const payloadHash = await sha256Hex(body);
  const canonicalRequest = [
    'POST',
    path,
    '', // no query string
    canonicalHeaders,
    signedHeaderNames,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = await hmac(encoder.encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaderNames}, Signature=${signature}`;

  return {
    url: `https://${host}${path}`,
    headers: {
      'content-encoding': 'amz-1.0',
      'content-type': 'application/json; charset=UTF-8',
      'host': host,
      'x-amz-date': amzDate,
      'x-amz-target': target,
      'Authorization': authorization,
    },
  };
}
