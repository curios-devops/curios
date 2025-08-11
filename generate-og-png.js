// Script to generate PNG OG image for LinkedIn (1200x630)
// This creates a basic PNG fallback in case SVG doesn't work

const canvas = document.createElement('canvas');
canvas.width = 1200;
canvas.height = 630;
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 1200, 630);

// Light blue gradient background
const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
gradient.addColorStop(0, 'rgba(0, 149, 255, 0.1)');
gradient.addColorStop(1, 'rgba(0, 149, 255, 0.05)');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1200, 630);

// CuriosAI branding
ctx.fillStyle = '#0095FF';
ctx.font = 'bold 32px Arial, sans-serif';
ctx.fillText('CuriosAI', 80, 120);

// Main title
ctx.fillStyle = '#1a1a1a';
ctx.font = 'bold 36px Arial, sans-serif';
ctx.fillText('AI-Powered Search & Analysis', 80, 200);

// Subtitle
ctx.fillStyle = '#666666';
ctx.font = '20px Arial, sans-serif';
ctx.fillText('Discover insights with comprehensive AI-driven research', 80, 280);

// Bottom accent line
ctx.fillStyle = '#0095FF';
ctx.fillRect(80, 580, 200, 4);

// Decorative elements
ctx.fillStyle = 'rgba(0, 149, 255, 0.3)';
ctx.beginPath();
ctx.arc(1000, 150, 8, 0, 2 * Math.PI);
ctx.fill();

ctx.fillStyle = 'rgba(0, 149, 255, 0.4)';
ctx.beginPath();
ctx.arc(1050, 200, 6, 0, 2 * Math.PI);
ctx.fill();

ctx.fillStyle = 'rgba(0, 149, 255, 0.5)';
ctx.beginPath();
ctx.arc(950, 250, 4, 0, 2 * Math.PI);
ctx.fill();

// Convert to PNG and download
canvas.toBlob(function(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'og-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}, 'image/png');

console.log('PNG OG image generated! Check your downloads folder.');
