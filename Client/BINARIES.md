# yt-dlp & FFmpeg Binaries for StreamHelper Client

This document explains the binary setup for the StreamHelper Client application, including both yt-dlp and FFmpeg binaries.

## 📁 Binary Locations

The binaries are stored in the following directory structure:

```
Client/dist/bin/
├── darwin/          # macOS binaries
│   ├── yt-dlp
│   └── ffmpeg
├── linux/           # Linux binaries
│   ├── yt-dlp
│   └── ffmpeg
└── win32/           # Windows binaries
    ├── yt-dlp.exe
    └── ffmpeg.exe
```

## 🔧 Current Versions

### yt-dlp
- **Version**: 2025.08.22
- **Source**: [yt-dlp GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases/tag/2025.08.22)
- **Last Updated**: August 28, 2025

### FFmpeg
- **Version**: Latest master build
- **Source**: [yt-dlp/FFmpeg-Builds](https://github.com/yt-dlp/FFmpeg-Builds/releases/tag/latest)
- **Last Updated**: Auto-updated with each build
- **Features**: GPL build with all codecs enabled

## 🚀 Quick Start

### 1. Verify Binary Installation

Check if the binaries for your platform are working:

```bash
# macOS
./Client/dist/bin/darwin/yt-dlp --version
./Client/dist/bin/darwin/ffmpeg -version

# Linux
./Client/dist/bin/linux/yt-dlp --version
./Client/dist/bin/linux/ffmpeg -version

# Windows
./Client/dist/bin/win32/yt-dlp.exe --version
./Client/dist/bin/win32/ffmpeg.exe -version
```

### 2. Test FFmpeg Integration

```bash
# Test that yt-dlp can find and use FFmpeg
./Client/dist/bin/darwin/yt-dlp --ffmpeg-location ./Client/dist/bin/darwin/ffmpeg --help
```

## 📥 Updating Binaries

### Automatic Update

Use the npm script to automatically download the latest binaries:

```bash
cd Client
npm run update-binaries
```

This will download both yt-dlp and FFmpeg binaries for all supported platforms.

### Manual Update

1. Download the latest releases:
   - yt-dlp: [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
   - FFmpeg: [FFmpeg builds](https://github.com/yt-dlp/FFmpeg-Builds/releases/tag/latest)
2. Place the binaries in the appropriate platform directory
3. Make them executable (macOS/Linux): `chmod +x bin/darwin/yt-dlp bin/darwin/ffmpeg`

## 🛠️ Binary Management Script

The `scripts/update-binaries.js` script automatically:

- Downloads yt-dlp binaries for all supported platforms
- Downloads FFmpeg binaries for all supported platforms
- Handles GitHub redirects
- Extracts compressed FFmpeg archives
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
   - Make the binary executable: `chmod +x Client/dist/bin/darwin/yt-dlp Client/dist/bin/darwin/ffmpeg`

3. **Wrong architecture**
   - Ensure you're using the correct binary for your platform
   - macOS: `darwin/yt-dlp` and `darwin/ffmpeg`
   - Linux: `linux/yt-dlp` and `linux/ffmpeg`
   - Windows: `win32/yt-dlp.exe` and `win32/ffmpeg.exe`

4. **FFmpeg not found by yt-dlp**
   - Verify FFmpeg path is correctly set in configuration
   - Check that FFmpeg binary is executable
   - Test manually: `./yt-dlp --ffmpeg-location ./ffmpeg --help`

### Verification Commands

```bash
# Check binaries exist
ls -la Client/dist/bin/darwin/yt-dlp
ls -la Client/dist/bin/darwin/ffmpeg

# Check permissions
file Client/dist/bin/darwin/yt-dlp
file Client/dist/bin/darwin/ffmpeg

# Test functionality
Client/dist/bin/darwin/yt-dlp --version
Client/dist/bin/darwin/ffmpeg -version

# Test integration
Client/dist/bin/darwin/yt-dlp --ffmpeg-location Client/dist/bin/darwin/ffmpeg --help
```

## 📋 Platform-Specific Notes

### macOS (darwin)
- **yt-dlp**: `yt-dlp_macos` binary
- **FFmpeg**: `ffmpeg-master-latest-macos64-gpl.tar.xz`
- **Architecture**: x86_64/ARM64
- **Permissions**: Executable (`chmod +x`)

### Linux
- **yt-dlp**: `yt-dlp_linux` binary
- **FFmpeg**: `ffmpeg-master-latest-linux64-gpl.tar.xz`
- **Architecture**: x86_64
- **Permissions**: Executable (`chmod +x`)

### Windows
- **yt-dlp**: `yt-dlp.exe` binary
- **FFmpeg**: `ffmpeg-master-latest-win64-gpl.zip`
- **Architecture**: x86_64
- **Permissions**: No special permissions needed

## 🔗 Integration with yt-dlp

StreamHelper automatically configures yt-dlp to use the bundled FFmpeg binary:

- **Automatic Detection**: The app automatically finds and configures FFmpeg path
- **Command Line Integration**: yt-dlp is called with `--ffmpeg-location` parameter
- **Enhanced Capabilities**: FFmpeg enables advanced video processing features
- **Format Support**: Better support for various video formats and codecs
- **Post-processing**: Enables video merging, conversion, and optimization

### Benefits of FFmpeg Integration

1. **Better Format Support**: Handles more video formats and codecs
2. **Video Merging**: Can merge separate video and audio streams
3. **Format Conversion**: Convert videos to different formats
4. **Quality Optimization**: Better quality control and processing
5. **Reliability**: More reliable downloads for complex streams

## 🔗 Related Files

- **Script**: `Client/scripts/update-binaries.js`
- **Package Script**: `npm run update-binaries`
- **Configuration**: Check your app's yt-dlp and FFmpeg path settings
- **Download Manager**: `Client/src/main/download/manager.ts`

## 📚 Additional Resources

- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp/wiki)
- [yt-dlp GitHub Repository](https://github.com/yt-dlp/yt-dlp)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [yt-dlp/FFmpeg-Builds](https://github.com/yt-dlp/FFmpeg-Builds)
- [StreamHelper Implementation Guide](IMPLEMENTATIONS.md)
