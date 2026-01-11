// Generate PWA icons from SVG
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

// For maskable icon, add padding (icon should be in safe zone ~80% of canvas)
const maskableSizes = [
  { name: 'icon-maskable-512.png', size: 512, padding: 51 }, // ~10% padding each side
];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate standard icons
  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, name));
    console.log(`Generated ${name}`);
  }

  // Generate maskable icons with padding and background
  for (const { name, size, padding } of maskableSizes) {
    const innerSize = size - (padding * 2);
    const iconBuffer = await sharp(svgBuffer)
      .resize(innerSize, innerSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 15, g: 15, b: 26, alpha: 1 } // #0f0f1a
      }
    })
      .composite([{
        input: iconBuffer,
        top: padding,
        left: padding
      }])
      .png()
      .toFile(path.join(outputDir, name));
    console.log(`Generated ${name} (maskable)`);
  }

  console.log('Done!');
}

generateIcons().catch(console.error);
