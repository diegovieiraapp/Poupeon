import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconColor = '#3A86FF'; // Primary blue color from our theme

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Set background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Calculate wallet icon dimensions (60% of canvas size)
  const iconSize = Math.floor(size * 0.6);
  const padding = (size - iconSize) / 2;

  // Draw wallet icon
  ctx.fillStyle = iconColor;
  ctx.beginPath();
  // Simplified wallet icon path
  const scale = iconSize / 24; // Scale from 24px (default) to target size
  ctx.translate(padding, padding);
  ctx.scale(scale, scale);
  ctx.moveTo(2, 3);
  ctx.lineTo(22, 3);
  ctx.quadraticCurveTo(24, 3, 24, 5);
  ctx.lineTo(24, 19);
  ctx.quadraticCurveTo(24, 21, 22, 21);
  ctx.lineTo(2, 21);
  ctx.quadraticCurveTo(0, 21, 0, 19);
  ctx.lineTo(0, 5);
  ctx.quadraticCurveTo(0, 3, 2, 3);
  ctx.closePath();
  ctx.fill();

  // Create icons directory if it doesn't exist
  const dir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save the icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(dir, `icon-${size}x${size}.png`), buffer);
}

// Generate icons for all sizes
sizes.forEach(size => generateIcon(size));

console.log('PWA icons generated successfully!');