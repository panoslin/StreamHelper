#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Icon sizes needed for the application
const ICON_SIZES = [16, 32, 48, 64, 128, 256, 512];

// Source SVG files
const SVG_FILES = {
  'concept-3a-dark': path.join(__dirname, '..', 'icon-designs', 'refined', 'concept-3a-dark-b-bold-arrow-centered.svg'),
  'concept-3c': path.join(__dirname, '..', 'icon-designs', 'refined', 'concept-3c-b-bold-arrow-centered.svg')
};

// Choose which design to use as the primary icon
const PRIMARY_DESIGN = 'concept-3c'; // Using the purple gradient design as primary
const DARK_DESIGN = 'concept-3a-dark'; // Using the dark design for dark theme

async function generateIcons() {
  console.log('🎨 Generating icons from SVG files...');
  
  // Check if SVG files exist
  for (const [name, filePath] of Object.entries(SVG_FILES)) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ SVG file not found: ${filePath}`);
      return;
    }
  }

  const outputDir = path.join(__dirname, '..', 'src', 'renderer');
  
  // Generate icons for the primary design (concept-3c)
  console.log(`\n📱 Generating icons for primary design: ${PRIMARY_DESIGN}`);
  const primarySvgPath = SVG_FILES[PRIMARY_DESIGN];
  
  for (const size of ICON_SIZES) {
    try {
      const outputPath = path.join(outputDir, `icon${size}.png`);
      
      await sharp(primarySvgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated icon${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate icon${size}.png:`, error.message);
    }
  }

  // Generate @2x version (double size of 256)
  try {
    const outputPath = path.join(outputDir, 'icon@2x.png');
    await sharp(primarySvgPath)
      .resize(512, 512)
      .png()
      .toFile(outputPath);
    console.log('✅ Generated icon@2x.png');
  } catch (error) {
    console.error('❌ Failed to generate icon@2x.png:', error.message);
  }

  // Generate favicon.ico (using 32x32 size)
  try {
    const faviconPath = path.join(outputDir, 'favicon.ico');
    await sharp(primarySvgPath)
      .resize(32, 32)
      .png()
      .toFile(faviconPath.replace('.ico', '.png'));
    
    // Note: Sharp doesn't support ICO format directly, so we'll create a PNG
    // The favicon.ico will need to be created manually or with another tool
    console.log('✅ Generated favicon.png (rename to favicon.ico manually)');
  } catch (error) {
    console.error('❌ Failed to generate favicon:', error.message);
  }

  // Generate the main icon.svg file (copy the primary design)
  try {
    const svgOutputPath = path.join(outputDir, 'icon.svg');
    fs.copyFileSync(primarySvgPath, svgOutputPath);
    console.log('✅ Generated icon.svg');
  } catch (error) {
    console.error('❌ Failed to generate icon.svg:', error.message);
  }

  console.log('\n🎉 Icon generation completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Rename favicon.png to favicon.ico in the renderer directory');
  console.log('2. Test the icons in the application');
  console.log('3. Update package.json if needed');
  
  // Show file sizes
  console.log('\n📊 Generated files:');
  for (const size of ICON_SIZES) {
    const filePath = path.join(outputDir, `icon${size}.png`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`   icon${size}.png: ${(stats.size / 1024).toFixed(1)} KB`);
    }
  }
}

// Run the icon generation
generateIcons().catch(console.error);