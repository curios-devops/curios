// Netlify Function to render the same OG SVG as PNG (fallback for LinkedIn/Twitter)
// Uses @resvg/resvg-js to rasterize the SVG produced by og-image.js

exports.handler = async (event) => {
  const { query, snippet } = event.queryStringParameters || {};

  if (!query) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Query parameter required' }) };
  }

  // Build absolute URL to this deployment (avoid hard-coded domain)
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers['x-forwarded-host'] || event.headers['host'];
  const base = `${proto}://${host}`;

  // Build the SVG URL from the existing SVG endpoint to avoid duplication
  const svgUrl = `${base}/.netlify/functions/og-image?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent((snippet || '').slice(0, 100))}`;

  try {
    const res = await fetch(svgUrl, { headers: { 'Accept': 'image/svg+xml' } });
    if (!res.ok) throw new Error(`Failed to fetch SVG (${res.status})`);
    const svg = await res.text();

    // Lazy-load resvg-js only when needed
    const { Resvg } = await import('@resvg/resvg-js');
    const renderer = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
      background: 'white'
    });
    const pngData = renderer.render();
    const pngBuffer = pngData.asPng();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      },
      body: pngBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('PNG fallback generation failed:', err);

    // Graceful fallback: return a minimal SVG so crawlers still see something
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300'
      },
      body: `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='627'><rect width='100%' height='100%' fill='white'/><text x='50' y='100' font-family='sans-serif' font-size='28' fill='#333'>CuriosAI Preview</text><text x='50' y='150' font-family='sans-serif' font-size='18' fill='#666'>PNG fallback failed. Using inline SVG.</text></svg>`
    };
  }
};
