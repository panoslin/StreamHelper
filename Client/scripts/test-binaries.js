#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BIN_DIR = path.join(__dirname, '..', 'dist', 'bin');

function testBinary(platform, binaryName, expectedCommand) {
  const binaryPath = path.join(BIN_DIR, platform, binaryName);
  
  console.log(`\nTesting ${platform} ${binaryName}...`);
  console.log(`Path: ${binaryPath}`);
  
  if (!fs.existsSync(binaryPath)) {
    console.log(`❌ Binary not found: ${binaryPath}`);
    return false;
  }
  
  try {
    const result = execSync(`"${binaryPath}" ${expectedCommand}`, { 
      encoding: 'utf8',
      timeout: 10000,
      stdio: 'pipe'
    });
    
    console.log(`✅ ${binaryName} working correctly`);
    console.log(`Output: ${result.trim().split('\n')[0]}`);
    return true;
  } catch (error) {
    console.log(`❌ ${binaryName} failed: ${error.message}`);
    return false;
  }
}

function testAllBinaries() {
  console.log('🧪 Testing StreamHelper Binaries');
  console.log('================================');
  
  const platforms = ['darwin', 'linux', 'win32'];
  const binaries = [
    { name: 'yt-dlp', command: '--version' },
    { name: 'ffmpeg', command: '-version' }
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const platform of platforms) {
    console.log(`\n📁 Platform: ${platform}`);
    console.log('─'.repeat(20));
    
    for (const binary of binaries) {
      const binaryName = platform === 'win32' 
        ? `${binary.name}.exe`
        : binary.name;
      
      totalTests++;
      if (testBinary(platform, binaryName, binary.command)) {
        passedTests++;
      }
    }
  }
  
  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All binaries are working correctly!');
  } else {
    console.log('\n⚠️  Some binaries failed. Run "npm run update-binaries" to fix.');
  }
}

// Run the tests
testAllBinaries();
