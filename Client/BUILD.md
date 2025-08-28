# StreamHelper Client - Build Guide

## 🚀 Quick Build

To build and package the StreamHelper Client application:

```bash
# Option 1: Use the build script (recommended)
npm run build:app

# Option 2: Manual build steps
npm run build
npm run package:current
```

## 📦 Build Outputs

After successful build, you'll find:

- **App Bundle**: `dist-packages/mac-arm64/StreamHelper Client.app`
- **DMG Package**: `dist-packages/StreamHelper Client-1.0.0-arm64.dmg`
- **Directory Package**: `dist-packages/mac-arm64/` (for development)

## 🎯 Installation

### From DMG Package (Recommended)
1. Double-click the DMG file to mount
2. Drag "StreamHelper Client" to your Applications folder
3. Launch from Applications

### Direct Run (Development)
```bash
# Run the packaged app directly
open "dist-packages/mac-arm64/StreamHelper Client.app"

# Or run in development mode
npm start
```

## 🔧 Development

### Prerequisites
- Node.js 18+ 
- npm 8+
- macOS (for current build)

### Development Commands
```bash
# Install dependencies
npm install

# Start development mode
npm start

# Build only
npm run build

# Build main process only
npm run build:main

# Build renderer only
npm run build:renderer

# Watch mode for main process
npm run build:watch

# Debug mode
npm run electron:debug
```

### Project Structure
```
src/
├── main/           # Electron main process
│   ├── communication/  # WebSocket server
│   ├── config/         # Configuration management
│   ├── download/       # Download manager
│   ├── ipc/           # IPC handlers
│   └── utils/         # Utilities
├── renderer/        # Angular application
│   ├── app/          # Angular components
│   ├── services/     # Angular services
│   └── pages/        # Page components
└── shared/          # Shared types and utilities
```

## 🐛 Troubleshooting

### Build Issues
- **TypeScript errors**: Run `npm run build:main` to see detailed errors
- **Angular build issues**: Check `angular.json` configuration
- **Electron packaging errors**: Try disabling ASAR (`"asar": false`)

### Runtime Issues
- **App won't start**: Check console for error messages
- **WebSocket connection failed**: Verify port 8080 is available
- **Download failures**: Check yt-dlp binary permissions

### Common Solutions
```bash
# Clean and rebuild
rm -rf dist/ dist-packages/ node_modules/
npm install
npm run build:app

# Reset configuration
rm -rf ~/.config/StreamHelper
```

## 📋 Build Configuration

The build configuration is in `package.json` under the `"build"` field:

```json
{
  "build": {
    "appId": "com.streamhelper.client",
    "productName": "StreamHelper Client",
    "directories": {
      "output": "dist-packages"
    },
    "files": ["dist/**/*"],
    "mac": {
      "category": "public.app-category.utilities",
      "target": "dmg"
    },
    "asar": false
  }
}
```

## 🔐 Code Signing

For production releases, you'll need to:
1. Obtain an Apple Developer ID
2. Configure code signing in the build config
3. Enable ASAR packaging for security

## 📱 Platform Support

Currently supports:
- ✅ macOS (ARM64/Intel64)
- 🔄 Windows (planned)
- 🔄 Linux (planned)

## 🎉 Success!

Your StreamHelper Client is now built and ready to use! The application includes:

- Real-time stream capture via WebSocket
- Download management with yt-dlp
- Modern Angular UI with PrimeNG components
- Cross-platform Electron architecture
- Complete business logic implementation

For more information, see the main [README.md](../README.md) and [IMPLEMENTATIONS.md](../IMPLEMENTATIONS.md).
