# StreamHelper Client

A desktop application that works with the StreamHelper Chrome extension to automatically download captured m3u8 streams using yt-dlp.

## 🚀 Features

- **Seamless Integration**: Direct communication with StreamHelper Chrome extension
- **Automated Downloads**: One-click download of captured streams
- **Real-time Progress**: Live download progress tracking and status updates
- **Cross-Platform**: Support for Windows, macOS, and Linux
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- **Queue Management**: Handle multiple downloads with concurrent processing
- **Quality Control**: Configurable video quality and format selection

## 🛠️ Technology Stack

- **Electron**: Cross-platform desktop application framework
- **React 18**: Modern UI development with hooks
- **TypeScript**: Type-safe development experience
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **Vite**: Fast build tool and development server
- **yt-dlp**: Powerful video downloader integration

## 📋 Prerequisites

- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 8+ or **yarn**: Version 1.22+
- **yt-dlp**: Installed and accessible in your system PATH

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/streamhelper/client.git
cd StreamHelperClient
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
```

### 3. Install yt-dlp
Make sure yt-dlp is installed and accessible in your system PATH:

**Windows:**
```bash
# Using winget
winget install yt-dlp

# Using chocolatey
choco install yt-dlp

# Manual installation
# Download from https://github.com/yt-dlp/yt-dlp/releases
```

**macOS:**
```bash
# Using Homebrew
brew install yt-dlp

# Using MacPorts
sudo port install yt-dlp
```

**Linux:**
```bash
# Using package manager
sudo apt install yt-dlp  # Ubuntu/Debian
sudo dnf install yt-dlp  # Fedora
sudo pacman -S yt-dlp    # Arch Linux

# Using pip
pip install yt-dlp
```

## 🏃‍♂️ Development

### Start development server
```bash
npm run dev
# or
yarn dev
```

This will:
- Start the Vite development server for the renderer process
- Build the main process TypeScript files
- Launch the Electron application in development mode

### Build for production
```bash
npm run build
# or
yarn build
```

### Package for distribution
```bash
# Package for current platform
npm run package

# Package for specific platforms
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

## 🏗️ Project Structure

```
StreamHelperClient/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts             # Application entry point
│   │   ├── communication/      # WebSocket server
│   │   ├── config/             # Configuration management
│   │   ├── download/           # Download engine with yt-dlp
│   │   ├── ipc/                # IPC handlers
│   │   └── utils/              # Utility functions
│   ├── renderer/               # React application
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Main application component
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   └── stores/            # State management
│   └── shared/                # Shared utilities and types
├── bin/                        # yt-dlp binaries (platform-specific)
├── public/                     # Static assets
├── dist/                       # Build output
└── package.json               # Project configuration
```

## 🔧 Configuration

The application stores configuration in the user's application data directory:

- **Windows**: `%APPDATA%\StreamHelper Client\config.json`
- **macOS**: `~/Library/Application Support/StreamHelper Client/config.json`
- **Linux**: `~/.config/StreamHelper Client/config.json`

### Key Configuration Options

- **Download Directory**: Where downloaded files are saved
- **Max Concurrent Downloads**: Number of simultaneous downloads
- **Default Quality**: Preferred video quality (auto, best, worst)
- **Default Format**: Preferred output format (mp4, mkv, webm)
- **yt-dlp Binary Path**: Path to yt-dlp executable
- **WebSocket Port**: Communication port for extension

## 🔌 Extension Integration

The StreamHelper Client communicates with the StreamHelper Chrome extension via WebSocket on port 8080 (configurable).

### Communication Protocol

- **STREAM_CAPTURED**: New m3u8 stream detected
- **DOWNLOAD_REQUEST**: Request to download stream
- **DOWNLOAD_PROGRESS**: Download progress updates
- **DOWNLOAD_COMPLETE**: Download finished
- **DOWNLOAD_ERROR**: Download failed

## 📥 Download Management

### Features

- **Queue System**: Manage multiple downloads with priorities
- **Progress Tracking**: Real-time progress bars and status
- **Quality Selection**: Choose video quality and format
- **Error Handling**: Automatic retry and error recovery
- **Batch Operations**: Start, pause, or cancel multiple downloads

### yt-dlp Integration

The application uses yt-dlp for downloading streams with support for:
- Multiple video formats (mp4, mkv, webm, etc.)
- Quality selection (144p to 4K)
- Subtitle downloads
- Thumbnail extraction
- Metadata preservation

## 🎨 User Interface

### Design Features

- **Responsive Layout**: Works on all screen sizes
- **Dark/Light Themes**: System preference support
- **Modern Components**: Built with Tailwind CSS
- **Accessibility**: WCAG compliant design
- **Animations**: Smooth transitions and feedback

### Navigation

- **Dashboard**: Overview and quick actions
- **Downloads**: Queue management and progress
- **Streams**: Captured stream history
- **Settings**: Application configuration

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📦 Distribution

### Building Distributables

```bash
# Build for current platform
npm run package

# Build for all platforms
npm run package:all
```

### Supported Platforms

- **Windows**: NSIS installer (.exe)
- **macOS**: DMG package (.dmg)
- **Linux**: AppImage (.AppImage)

## 🐛 Troubleshooting

### Common Issues

1. **yt-dlp not found**
   - Ensure yt-dlp is installed and in your PATH
   - Check the binary path in Settings

2. **Extension connection failed**
   - Verify the StreamHelper extension is installed
   - Check if port 8080 is available
   - Restart both the client and extension

3. **Download failures**
   - Check stream URL validity
   - Verify output directory permissions
   - Review yt-dlp error messages

### Debug Mode

Enable debug logging by running:
```bash
npm run dev
```

The application will show detailed logs in the console.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint and Prettier for code quality
- Write tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video downloader
- [Electron](https://electronjs.org/) - Desktop app framework
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/streamhelper/client/issues)
- **Discussions**: [GitHub Discussions](https://github.com/streamhelper/client/discussions)
- **Documentation**: [Wiki](https://github.com/streamhelper/client/wiki)

---

**StreamHelper Client** - Making stream downloading simple and efficient.
