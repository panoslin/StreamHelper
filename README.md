# 🎬 StreamHelper

> **Professional Stream Capture & Download Management System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform: Cross-Platform](https://img.shields.io/badge/Platform-Cross--Platform-blue.svg)](https://github.com/panoslin/StreamHelper)
[![Electron: Latest](https://img.shields.io/badge/Electron-Latest-green.svg)](https://electronjs.org/)

StreamHelper is a powerful, cross-platform desktop application designed for content creators, researchers, and anyone who needs to capture and download streaming content efficiently. Built with modern web technologies and Electron, it provides a seamless experience for managing multiple downloads with advanced features.

## ✨ Features

### 🚀 **Core Functionality**
- **Stream Capture**: Automatically detect and capture streaming URLs from web pages
- **Batch Downloads**: Queue and manage multiple downloads simultaneously
- **Smart Queue Management**: Intelligent download scheduling with priority control
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **yt-dlp Integration**: Built-in yt-dlp binary management for reliable downloads

### 🎯 **Advanced Download Management**
- **Concurrent Downloads**: Configurable simultaneous download limits
- **Progress Tracking**: Real-time progress bars with speed and ETA information
- **Retry System**: Automatic retry for failed downloads with configurable attempts
- **Download History**: Complete history with detailed logs and status tracking

### 🎨 **Modern User Interface**
- **Theme Support**: Light, Dark, and Auto themes with system integration
- **Responsive Design**: Clean, intuitive interface that adapts to your preferences
- **Real-time Updates**: Live status updates and progress monitoring
- **Toast Notifications**: User-friendly feedback for all operations

### 🔧 **Developer-Friendly Features**
- **Comprehensive Logging**: Detailed logs for debugging and monitoring
- **WebSocket Integration**: Real-time communication with browser extensions
- **Configurable Settings**: Customizable download directories and preferences
- **Error Handling**: Robust error handling with user-friendly messages

## 🏗️ Architecture

```
StreamHelper/
├── Client/                 # Desktop Application (Electron + Angular)
│   ├── src/
│   │   ├── main/          # Main Process (Electron)
│   │   ├── renderer/      # Renderer Process (Angular)
│   │   └── shared/        # Shared Utilities & Types
│   ├── scripts/           # Build and utility scripts
│   │   └── update-binaries.js  # yt-dlp binary downloader
│   └── dist/              # Built Application
│       └── bin/           # yt-dlp binaries (auto-downloaded)
│           ├── darwin/     # macOS binaries
│           ├── linux/      # Linux binaries
│           └── win32/      # Windows binaries
├── Extension/             # Chrome Extension
│   ├── background/        # Service Worker
│   ├── content/           # Content Scripts
│   └── popup/            # Extension Popup UI
└── docs/                 # Documentation
```

### **Technology Stack**
- **Frontend**: Angular 17+ with PrimeNG components
- **Desktop**: Electron 28+ for cross-platform compatibility
- **Extension**: Chrome Extension Manifest V3
- **Styling**: CSS3 with CSS Variables and modern layouts
- **Build Tools**: Angular CLI, TypeScript, Webpack

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ and npm
- Git
- Chrome browser (for extension)
- yt-dlp binary (automatically downloaded during setup)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/panoslin/StreamHelper.git
   cd StreamHelper
   ```

2. **Install dependencies**
   ```bash
   cd Client
   npm install
   ```

3. **Download yt-dlp binaries**
   ```bash
   # This downloads the latest yt-dlp binaries for all platforms
   node scripts/update-binaries.js
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

4. **Start the application**
   ```bash
   npm start
   ```

### **yt-dlp Binary Management**

StreamHelper automatically downloads and manages the latest yt-dlp binaries for all supported platforms:

#### **Automatic Binary Download**
```bash
# Download latest yt-dlp binaries for all platforms
node scripts/update-binaries.js
```

#### **Supported Platforms**
- **macOS**: `yt-dlp_macos` binary
- **Linux**: `yt-dlp_linux` binary  
- **Windows**: `yt-dlp.exe` binary

#### **Binary Locations**
```
Client/dist/bin/
├── darwin/     # macOS binaries
├── linux/      # Linux binaries
└── win32/      # Windows binaries
```

#### **Version Management**
- Binaries are automatically updated to the latest stable release
- Current version: `2025.08.22`
- Binaries are verified after download for integrity

### **Chrome Extension Setup**

1. **Load the extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `Extension/` folder

2. **Configure connection**
   - The extension will automatically connect to the desktop app
   - Default WebSocket port: `8080`

## 📖 Usage

### **Basic Workflow**

1. **Start StreamHelper Desktop App**
   - Launch the application
   - Verify WebSocket server is running (port 8080)

2. **Browse and Capture**
   - Navigate to any streaming website
   - The Chrome extension will automatically detect streams
   - Click the extension icon to view captured streams

3. **Download Management**
   - View all captured streams in the Downloads tab
   - Configure download directory and concurrent limits
   - Monitor progress with real-time updates

### **Advanced Features**

#### **Theme Customization**
- **Light Theme**: Clean, bright interface for daytime use
- **Dark Theme**: Easy on the eyes for low-light environments
- **Auto Theme**: Automatically follows your system preference

#### **Download Controls**
- **Retry Failed Downloads**: One-click retry for failed downloads
- **View Detailed Logs**: Access complete download logs for debugging
- **Remove History**: Clean up completed or failed downloads

#### **Settings Configuration**
- **Download Directory**: Customize where files are saved
- **Concurrent Downloads**: Adjust simultaneous download limits
- **WebSocket Port**: Configure communication port if needed

## 🔧 Configuration

### **Application Settings**
```json
{
  "webSocketPort": 8080,
  "maxConcurrentDownloads": 3,
  "defaultDownloadDir": "~/Downloads/StreamHelper",
  "theme": "auto",
  "autoStartDownloads": true,
  "notifications": true
}
```

### **Environment Variables**
- `NODE_ENV`: Set to `development` for debug mode
- `ELECTRON_IS_DEV`: Enable development features

## 🛠️ Development

### **Development Setup**

1. **Install development dependencies**
   ```bash
   npm install -g @angular/cli
   ```

2. **Download yt-dlp binaries**
   ```bash
   # Required for development and testing
   node scripts/update-binaries.js
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

### **Project Structure**
```
src/
├── main/                  # Electron main process
│   ├── download/         # Download management
│   ├── ipc/             # IPC handlers
│   ├── config/          # Configuration management
│   └── communication/   # WebSocket server
├── renderer/             # Angular application
│   ├── components/       # Reusable UI components
│   ├── pages/           # Application pages
│   ├── services/        # Business logic services
│   └── shared/          # Shared utilities
└── types/               # TypeScript type definitions
```

### **Available Scripts**
- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run start` - Start production build
- `npm run test` - Run unit tests
- `npm run lint` - Run linting

## 🧪 Testing

### **Running Tests**
```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# Test coverage
npm run test:coverage
```

### **Test Structure**
- **Unit Tests**: Component and service testing
- **Integration Tests**: Service integration testing
- **E2E Tests**: End-to-end user workflow testing

## 🔧 Troubleshooting

### **Common Issues**

#### **yt-dlp Binary Not Found**
```bash
# Error: yt-dlp binary not found
# Solution: Download the binaries first
node scripts/update-binaries.js
```

#### **Binary Permission Issues (macOS/Linux)**
```bash
# Error: Permission denied when running yt-dlp
# Solution: Make binary executable
chmod +x Client/dist/bin/darwin/yt-dlp
chmod +x Client/dist/bin/linux/yt-dlp
```

#### **Download Failures**
```bash
# If binary download fails, check:
# 1. Internet connection
# 2. GitHub access
# 3. Firewall settings
# 4. Try running the script again
node scripts/update-binaries.js
```

### **Binary Verification**
```bash
# Verify downloaded binaries work correctly
Client/dist/bin/darwin/yt-dlp --version    # macOS
Client/dist/bin/linux/yt-dlp --version     # Linux
Client/dist/bin/win32/yt-dlp.exe --version # Windows
```

## 📦 Building & Distribution

### **Build Targets**
- **Windows**: `.exe` installer and portable version
- **macOS**: `.dmg` installer and `.app` bundle
- **Linux**: `.AppImage` and `.deb` packages

### **Build Commands**
```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:win
npm run build:mac
npm run build:linux

# Build all platforms
npm run build:all
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Guidelines**
- Follow Angular style guide
- Use TypeScript strict mode
- Write comprehensive tests
- Update documentation for new features

### **Code Quality**
- ESLint configuration for code consistency
- Prettier for code formatting
- Husky for pre-commit hooks
- Conventional commits for version control

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron Team** for the amazing cross-platform framework
- **Angular Team** for the robust frontend framework
- **PrimeNG Team** for the beautiful UI components
- **Open Source Community** for inspiration and support

## 📞 Support

### **Getting Help**
- **Issues**: [GitHub Issues](https://github.com/panoslin/StreamHelper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/panoslin/StreamHelper/discussions)
- **Documentation**: [Wiki](https://github.com/panoslin/StreamHelper/wiki)

<!-- ### **Community**
- **Discord**: Join our [Discord Server](https://discord.gg/streamhelper)
- **Reddit**: Visit [r/StreamHelper](https://reddit.com/r/StreamHelper)
- **Twitter**: Follow [@StreamHelper](https://twitter.com/StreamHelper) -->

---

<div align="center">

**Made with ❤️ by the StreamHelper Team**

[![GitHub stars](https://img.shields.io/github/stars/panoslin/StreamHelper?style=social)](https://github.com/panoslin/StreamHelper)
[![GitHub forks](https://img.shields.io/github/forks/panoslin/StreamHelper?style=social)](https://github.com/panoslin/StreamHelper)
[![GitHub issues](https://img.shields.io/github/issues/panoslin/StreamHelper?style=social)](https://github.com/panoslin/StreamHelper/issues)

**Star this repository if you find it helpful! ⭐**

</div>
