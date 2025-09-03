#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const YTDLP_VERSION = '2025.08.22';
const YTDLP_BASE_URL = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}`;

// FFmpeg binaries from ffbinaries.com (more reliable and maintained)
const FFMPEG_VERSION = '6.1';
const FFMPEG_BASE_URL = `https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v${FFMPEG_VERSION}`;

const BIN_DIR = path.join(__dirname, '..', 'dist', 'bin');

const PLATFORMS = {
  darwin: {
    ytdlp: {
      url: `${YTDLP_BASE_URL}/yt-dlp_macos`,
      filename: 'yt-dlp',
      executable: true
    },
    ffmpeg: {
      url: `${FFMPEG_BASE_URL}/ffmpeg-${FFMPEG_VERSION}-macos-64.zip`,
      filename: 'ffmpeg.zip',
      executable: true,
      extract: true,
      extractPath: 'ffmpeg',
      optional: false
    }
  },
  linux: {
    ytdlp: {
      url: `${YTDLP_BASE_URL}/yt-dlp_linux`,
      filename: 'yt-dlp',
      executable: true
    },
    ffmpeg: {
      url: `${FFMPEG_BASE_URL}/ffmpeg-${FFMPEG_VERSION}-linux-64.zip`,
      filename: 'ffmpeg.zip',
      executable: true,
      extract: true,
      extractPath: 'ffmpeg',
      optional: false
    }
  },
  win32: {
    ytdlp: {
      url: `${YTDLP_BASE_URL}/yt-dlp.exe`,
      filename: 'yt-dlp.exe',
      executable: false
    },
    ffmpeg: {
      url: `${FFMPEG_BASE_URL}/ffmpeg-${FFMPEG_VERSION}-win-64.zip`,
      filename: 'ffmpeg.zip',
      executable: false,
      extract: true,
      extractPath: 'ffmpeg.exe',
      optional: false
    }
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
    
    request.setTimeout(60000, () => { // Increased timeout for larger FFmpeg files
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

function makeExecutable(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      execSync(`chmod +x "${filepath}"`);
      console.log(`Made executable: ${filepath}`);
    } else {
      console.error(`File not found for chmod: ${filepath}`);
    }
  } catch (error) {
    console.error(`Failed to make executable: ${filepath}`, error.message);
  }
}

function extractArchive(archivePath, extractDir, extractPath) {
  return new Promise((resolve, reject) => {
    try {
      const isZip = archivePath.endsWith('.zip');
      const extractCommand = isZip 
        ? `unzip -o "${archivePath}" -d "${extractDir}"`
        : `tar -xf "${archivePath}" -C "${extractDir}"`;
      
      execSync(extractCommand, { stdio: 'inherit' });
      
      // The extracted binary should be directly in the extractDir
      const finalBinaryPath = path.join(path.dirname(archivePath), path.basename(extractPath));
      
      // Check if the binary was extracted directly to the platform directory
      if (fs.existsSync(finalBinaryPath)) {
        console.log(`Extracted binary found: ${finalBinaryPath}`);
        
        // Clean up the archive
        fs.unlinkSync(archivePath);
        
        resolve(finalBinaryPath);
      } else {
        // Try to find the binary in the extracted directory
        const extractedBinaryPath = path.join(extractDir, extractPath);
        if (fs.existsSync(extractedBinaryPath)) {
          fs.renameSync(extractedBinaryPath, finalBinaryPath);
          console.log(`Extracted and moved: ${finalBinaryPath}`);
          
          // Clean up the archive
          fs.unlinkSync(archivePath);
          
          resolve(finalBinaryPath);
        } else {
          // List files in extractDir to debug
          const files = fs.readdirSync(extractDir);
          console.log(`Files in extract directory: ${files.join(', ')}`);
          reject(new Error(`Extracted binary not found. Expected: ${extractPath}, Found: ${files.join(', ')}`));
        }
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function downloadBinary(platform, binaryType, config) {
  const platformDir = path.join(BIN_DIR, platform);
  const filepath = path.join(platformDir, config.filename);
  
  // Create platform directory if it doesn't exist
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true });
  }
  
  console.log(`Downloading ${platform} ${binaryType}...`);
  
  try {
    await downloadFile(config.url, filepath);
    console.log(`Downloaded: ${filepath}`);
    
    let finalBinaryPath = filepath;
    
    // Extract if needed
    if (config.extract) {
      console.log(`Extracting ${binaryType}...`);
      finalBinaryPath = await extractArchive(filepath, platformDir, config.extractPath);
    }
    
    // Make executable if needed
    if (config.executable && fs.existsSync(finalBinaryPath)) {
      makeExecutable(finalBinaryPath);
    }
    
    // Verify the binary (only for yt-dlp, skip FFmpeg verification on different platforms)
    if (binaryType === 'ytdlp' && platform !== 'win32') {
      try {
        const version = execSync(`"${finalBinaryPath}" --version`, { encoding: 'utf8' }).trim();
        console.log(`✓ ${platform} ${binaryType} verified: ${version.split('\n')[0]}`);
      } catch (error) {
        console.error(`✗ Failed to verify ${platform} ${binaryType}:`, error.message);
      }
    }
    
    return finalBinaryPath;
    
  } catch (error) {
    if (config.optional) {
      console.warn(`Skipping optional ${platform} ${binaryType}: ${error.message}`);
      return null;
    } else {
      console.error(`Failed to download ${platform} ${binaryType}:`, error.message);
      throw error;
    }
  }
}

async function updateBinaries() {
  console.log(`Updating yt-dlp binaries to version ${YTDLP_VERSION}...`);
  console.log(`Updating FFmpeg binaries to version ${FFMPEG_VERSION}...`);
  
  // Ensure bin directory exists
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }
  
  for (const [platform, binaries] of Object.entries(PLATFORMS)) {
    console.log(`\nProcessing ${platform} platform...`);
    
    for (const [binaryType, config] of Object.entries(binaries)) {
      try {
        await downloadBinary(platform, binaryType, config);
      } catch (error) {
        console.error(`Failed to process ${platform} ${binaryType}:`, error.message);
      }
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