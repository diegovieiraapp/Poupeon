import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { WalletIcon } from './WalletIcon';
import fs from 'fs';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const publicDir = path.join(process.cwd(), 'public', 'icons');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  for (const size of sizes) {
    const svg = renderToString(
      createElement(WalletIcon, { size, color: '#3A86FF' })
    );

    const svgPath = path.join(publicDir, `icon-${size}x${size}.svg`);
    fs.writeFileSync(svgPath, svg);
    
    // Here we would convert SVG to PNG, but since we can't use native modules,
    // you'll need to convert these SVGs to PNGs using an external tool
    console.log(`Generated ${svgPath}`);
  }
}

generateIcons().catch(console.error);