const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script para optimizar imágenes del proyecto
 * Requiere ImageMagick instalado: brew install imagemagick
 */
function optimizeImages() {
  const publicDir = path.join(__dirname, 'public');
  const faviconPath = path.join(publicDir, 'favicon.png');

  if (!fs.existsSync(faviconPath)) {
    console.log('No se encontró favicon.png en public/');
    return;
  }

  console.log('Optimizando favicon...');

  try {
    // Crear diferentes tamaños del favicon
    const sizes = [16, 32, 64, 128, 256];

    sizes.forEach(size => {
      const outputPath = path.join(publicDir, `favicon-${size}x${size}.png`);
      execSync(`convert "${faviconPath}" -resize ${size}x${size} "${outputPath}"`);
      console.log(`✓ Creado favicon-${size}x${size}.png`);
    });

    // Optimizar tamaño del favicon original
    execSync(`convert "${faviconPath}" -strip -quality 85 "${faviconPath}.tmp" && mv "${faviconPath}.tmp" "${faviconPath}"`);
    console.log('✓ Favicon original optimizado');

    console.log('Optimización completada!');
  } catch (error) {
    console.error('Error optimizando imágenes:', error.message);
    console.log('Asegúrate de tener ImageMagick instalado: brew install imagemagick');
  }
}

if (require.main === module) {
  optimizeImages();
}

module.exports = { optimizeImages };
