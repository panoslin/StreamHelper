#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const VERSION = '2025.08.22';
const BASE_URL = `https://github.com/yt-dlp/yt-dlp/releases/download/${VERSION}`;
const BIN_DIR = path.join(__dirname, '..', 'dist', 'bin');

const PLATFORMS = {
  darwin: {
    url: `${BASE_URL}/yt-dlp_macos`,
    filename: 'yt-dlp',
    executable: true
  },
  linux: {
    url: `${BASE_URL}/yt-dlp_linux`,
    filename: 'yt-dlp',
    executable: true
  },
  win32: {
    url: `${BASE_URL}/yt-dlp.exe`,
    filename: 'yt-dlp.exe',
    executable: false
  }
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const newUrl = response.headers.location;
        console.log(`Following redirect to: ${newUrl}`);
        file.close();
        fs.unlink(filepath, () => {}); // Clean up the partial file
        downloadFile(newUrl, filepath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file if there was an error
        reject(err);
      });
    }).on('error', reject);
    
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

function makeExecutable(filepath) {
  try {
    execSync(`chmod +x "${filepath}"`);
    console.log(`Made executable: ${filepath}`);
  } catch (error) {
    console.error(`Failed to make executable: ${filepath}`, error.message);
  }
}

async function updateBinaries() {
  console.log(`Updating yt-dlp binaries to version ${VERSION}...`);
  
  // Ensure bin directory exists
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }
  
  for (const [platform, config] of Object.entries(PLATFORMS)) {
    const platformDir = path.join(BIN_DIR, platform);
    const filepath = path.join(platformDir, config.filename);
    
    // Create platform directory if it doesn't exist
    if (!fs.existsSync(platformDir)) {
      fs.mkdirSync(platformDir, { recursive: true });
    }
    
    console.log(`Downloading ${platform} binary...`);
    
    try {
      await downloadFile(config.url, filepath);
      console.log(`Downloaded: ${filepath}`);
      
      if (config.executable) {
        makeExecutable(filepath);
      }
      
      // Verify the binary
      if (platform !== 'win32') {
        try {
          const version = execSync(`"${filepath}" --version`, { encoding: 'utf8' }).trim();
          console.log(`✓ ${platform} binary verified: ${version}`);
        } catch (error) {
          console.error(`✗ Failed to verify ${platform} binary:`, error.message);
        }
      }
      
    } catch (error) {
      console.error(`Failed to download ${platform} binary:`, error.message);
    }
  }
  
  console.log('\nBinary update complete!');
  console.log('Available platforms:');
  
  for (const platform of Object.keys(PLATFORMS)) {
    const platformDir = path.join(BIN_DIR, platform);
    if (fs.existsSync(platformDir)) {
      const files = fs.readdirSync(platformDir);
      console.log(`  ${platform}: ${files.join(', ')}`);
    }
  }
}

// Run the update
updateBinaries().catch(console.error);
