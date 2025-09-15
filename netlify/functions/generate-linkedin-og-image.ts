import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';

// LinkedIn image requirements:
// - Optimal size: 1200 × 627 pixels (1.91:1 aspect ratio)
// - Maximum file size: 5MB
// - Supported formats: PNG, JPEG, GIF

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  try {
    const { searchParams } = new URL(event.rawUrl);
    const imageUrl = searchParams.get('imageUrl');
    const query = searchParams.get('query') || 'Search Results';
    
    console.log(`🖼️ Processing image for LinkedIn: ${imageUrl}`);
    console.log(`🔍 Query: ${query}`);
    
    if (!imageUrl) {
      return {
        statusCode: 400,
        body: 'Missing imageUrl parameter'
      };
    }

    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Check image buffer size (LinkedIn limit: 5MB)
    const imageSizeInMB = imageBuffer.byteLength / (1024 * 1024);
    console.log(`📏 Original image size: ${imageSizeInMB.toFixed(2)}MB`);
    
    if (imageSizeInMB > 4.5) { // Leave buffer for processing overhead
      console.warn('⚠️ Image too large, using fallback');
      throw new Error('Image size exceeds 4.5MB limit');
    }

    // Create HTML canvas to resize and overlay text
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            canvas { display: block; }
        </style>
    </head>
    <body>
        <canvas id="canvas" width="1200" height="627"></canvas>
        <script>
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            
            // Create image from base64
            const img = new Image();
            img.onload = function() {
                // Fill background with dark color
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, 1200, 627);
                
                // Calculate scaling to fit and center the image (maintain LinkedIn 1.91:1 ratio)
                const scale = Math.min(1200 / img.width, 627 / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (1200 - scaledWidth) / 2;
                const y = (627 - scaledHeight) / 2;
                
                // Draw the image
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                
                // Add overlay with query text (adjusted for 627 height)
                const gradient = ctx.createLinearGradient(0, 527, 0, 627);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 527, 1200, 100);
                
                // Add query text
                ctx.fillStyle = 'white';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'left';
                const maxWidth = 1100;
                const text = '${query.replace(/'/g, "\\'")}';
                
                // Word wrap the text
                const words = text.split(' ');
                let line = '';
                let y = 577;
                
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    
                    if (testWidth > maxWidth && n > 0) {
                        ctx.fillText(line, 50, y);
                        line = words[n] + ' ';
                        y += 36;
                    } else {
                        line = testLine;
                    }
                    
                    if (y > 607) break; // Don't overflow (adjusted for 627 height)
                }
                ctx.fillText(line, 50, y);
                
                // Add CuriosAI branding
                ctx.font = '18px Arial';
                ctx.fillStyle = '#0095FF';
                ctx.fillText('curiosai.com', 50, 547);
                
                // Convert to PNG and check size before returning
                canvas.toBlob(function(blob) {
                    // Check blob size (LinkedIn 5MB limit)
                    const sizeInMB = blob.size / (1024 * 1024);
                    console.log(\`Generated PNG size: \${sizeInMB.toFixed(2)}MB\`);
                    
                    if (sizeInMB > 4.8) {
                        console.warn('Generated image too large for LinkedIn');
                        // Could implement compression here or fall back to SVG
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function() {
                        const base64 = reader.result.split(',')[1];
                        window.parent.postMessage(base64, '*');
                    };
                    reader.readAsDataURL(blob);
                }, 'image/png');
            };
            
            img.src = 'data:${imageMimeType};base64,${imageBase64}';
        </script>
    </body>
    </html>`;

    // Create optimized LinkedIn image (1200 × 627 pixels)
    // We'll embed the image as base64 in an SVG
    const svg = `
    <svg width="1200" height="627" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0095FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#007ACC;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0);stop-opacity:0" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.8);stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="627" fill="url(#bg)"/>
      
      <!-- Search result image with proper aspect ratio -->
      <image href="data:${imageMimeType};base64,${imageBase64}" 
             x="50" y="50" width="1100" height="385" 
             preserveAspectRatio="xMidYMid slice"/>
      
      <!-- Overlay for text readability -->
      <rect x="0" y="435" width="1200" height="192" fill="url(#overlay)"/>
      
      <!-- Query text -->
      <text x="70" y="495" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">
        ${query.length > 50 ? query.substring(0, 47) + '...' : query}
      </text>
      
      <!-- CuriosAI branding -->
      <text x="70" y="555" font-family="Arial, sans-serif" font-size="20" font-weight="500" fill="#0095FF">
        curiosai.com
      </text>
    </svg>`;

    // Check final SVG size estimation
    const svgSize = new TextEncoder().encode(svg).length;
    const svgSizeInMB = svgSize / (1024 * 1024);
    console.log(`📊 Generated SVG size: ${svgSizeInMB.toFixed(2)}MB`);
    
    if (svgSizeInMB > 4.8) {
      console.warn('⚠️ Generated image may be too large');
      throw new Error('Generated image size approaches LinkedIn 5MB limit');
    }

    console.log('✅ Successfully generated LinkedIn-optimized image (1200×627)');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        ...(svgSize ? { 'Content-Length': svgSize.toString() } : {})
      },
      body: svg
    };

  } catch (error) {
    console.error('❌ Error generating OG image from search result:', error);
    
    // Fallback to simple text-based image with optimal LinkedIn dimensions
    const query = new URL(event.rawUrl).searchParams.get('query') || 'Search Results';
    console.log('🔄 Using fallback image generation');
    
    const fallbackSvg = `
    <svg width="1200" height="627" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0095FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#007ACC;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="1200" height="627" fill="url(#bg)"/>
      
      <text x="100" y="280" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">
        ${query.length > 40 ? query.substring(0, 37) + '...' : query}
      </text>
      
      <text x="100" y="360" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)">
        Search results powered by CuriosAI
      </text>
      
      <text x="100" y="430" font-family="Arial, sans-serif" font-size="20" fill="#0095FF">
        curiosai.com
      </text>
    </svg>`;

    console.log('✅ Generated fallback LinkedIn image (1200×627)');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      },
      body: fallbackSvg
    };
  }
};
