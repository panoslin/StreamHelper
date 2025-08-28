# yt-dlp Binaries for StreamHelper Client

This document explains the yt-dlp binary setup for the StreamHelper Client application.

## 📁 Binary Locations

The yt-dlp binaries are stored in the following directory structure:

```
Client/dist/bin/
├── darwin/          # macOS binaries
│   └── yt-dlp
├── linux/           # Linux binaries
│   └── yt-dlp
└── win32/           # Windows binaries
    └── yt-dlp.exe
```

## 🔧 Current Version

- **Version**: 2025.08.22
- **Source**: [yt-dlp GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases/tag/2025.08.22)
- **Last Updated**: August 28, 2025

## 🚀 Quick Start

### 1. Verify Binary Installation

Check if the binary for your platform is working:

```bash
# macOS
./Client/dist/bin/darwin/yt-dlp --version

# Linux
./Client/dist/bin/linux/yt-dlp --version

# Windows
./Client/dist/bin/win32/yt-dlp.exe --version
```

### 2. Test Basic Functionality

```bash
# macOS example
./Client/dist/bin/darwin/yt-dlp --help
```

## 📥 Updating Binaries

### Automatic Update

Use the npm script to automatically download the latest binaries:

```bash
cd Client
npm run update-binaries
```

### Manual Update

1. Download the latest release from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
2. Place the binary in the appropriate platform directory
3. Make it executable (macOS/Linux): `chmod +x bin/darwin/yt-dlp`

## 🛠️ Binary Management Script

The `scripts/update-binaries.js` script automatically:

- Downloads binaries for all supported platforms
- Handles GitHub redirects
- Sets proper permissions
- Verifies binary functionality
- Creates necessary directories

### Running the Script

```bash
cd Client
node scripts/update-binaries.js
```

## 🔍 Troubleshooting

### Common Issues

1. **Binary not found (ENOENT)**
   - Ensure the binary exists in the correct platform directory
   - Check file permissions: `ls -la Client/dist/bin/darwin/`
   - Verify the binary path in your configuration

2. **Permission denied**
   - Make the binary executable: `chmod +x Client/dist/bin/darwin/yt-dlp`

3. **Wrong architecture**
   - Ensure you're using the correct binary for your platform
   - macOS: `darwin/yt-dlp`
   - Linux: `linux/yt-dlp`
   - Windows: `win32/yt-dlp.exe`

### Verification Commands

```bash
# Check binary exists
ls -la Client/dist/bin/darwin/yt-dlp

# Check permissions
file Client/dist/bin/darwin/yt-dlp

# Test functionality
Client/dist/bin/darwin/yt-dlp --version
```

## 📋 Platform-Specific Notes

### macOS (darwin)
- Binary: `yt-dlp_macos`
- Architecture: x86_64/ARM64
- Permissions: Executable (`chmod +x`)

### Linux
- Binary: `yt-dlp_linux`
- Architecture: x86_64
- Permissions: Executable (`chmod +x`)

### Windows
- Binary: `yt-dlp.exe`
- Architecture: x86_64
- Permissions: No special permissions needed

## 🔗 Related Files

- **Script**: `Client/scripts/update-binaries.js`
- **Package Script**: `npm run update-binaries`
- **Configuration**: Check your app's yt-dlp path setting

## 📚 Additional Resources

- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp/wiki)
- [yt-dlp GitHub Repository](https://github.com/yt-dlp/yt-dlp)
- [StreamHelper Implementation Guide](IMPLEMENTATIONS.md)
