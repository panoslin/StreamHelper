# StreamHelper - Chrome Extension for M3U8 Request Capture

A modern, clean Chrome extension that captures m3u8 streaming requests from web pages and provides an intuitive interface to view, search, and copy these URLs.

## Features

- **Real-time M3U8 Capture**: Automatically captures all m3u8 requests as you browse
- **Modern UI**: Clean, Material Design-inspired interface
- **Smart URL Display**: Truncates long URLs for better readability with full URL on hover
- **Search & Filter**: Quickly find specific requests
- **One-click Copy**: Copy any m3u8 URL to clipboard
- **yt-dlp Integration**: Generate and copy yt-dlp download commands
- **Request Management**: Delete individual requests or clear all
- **Export Functionality**: Export captured requests to JSON
- **Page Context**: Shows which page each request came from
- **Real-time Updates**: Live notifications when new requests are captured

## Installation

### Development Mode (Recommended for testing)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `StreamHelper` folder
5. The extension icon should appear in your Chrome toolbar

### Production Installation

1. Download the `.crx` file (when available)
2. Drag and drop the file into Chrome's extensions page
3. Confirm the installation

## Usage

1. **Install the extension** following the installation steps above
2. **Browse normally** - the extension automatically captures m3u8 requests in the background
3. **Click the extension icon** to open the popup interface
4. **View captured requests** in the clean, organized list
5. **Search requests** using the search bar
6. **Copy URLs** by clicking the copy button on any request
7. **Manage requests** by deleting individual ones or clearing all

## How It Works

### Architecture

- **Background Service Worker**: Intercepts network requests using Chrome's webRequest API
- **Content Script**: Provides page context and additional information
- **Popup Interface**: Modern UI for viewing and managing captured requests
- **Chrome Storage**: Persists captured requests between browser sessions

### Request Capture Process

1. Extension monitors all network requests in the background
2. Filters for requests containing `.m3u8` in the URL
3. Captures request details including:
   - Full URL
   - HTTP method
   - Timestamp
   - Page title and URL
   - Request type and metadata
4. Stores in Chrome's local storage
5. Updates popup interface in real-time

## File Structure

```
StreamHelper/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background service worker
├── content/
│   └── content-script.js      # Content script for page context
├── popup/
│   ├── popup.html            # Popup interface HTML
│   ├── popup.css             # Modern styling
│   └── popup.js              # Popup functionality
├── icons/
│   ├── icon.svg              # Vector icon source
│   ├── icon16.png            # 16x16 icon (placeholder)
│   ├── icon48.png            # 48x48 icon (placeholder)
│   └── icon128.png           # 128x128 icon (placeholder)
├── generate_icons.html       # Icon generation utility
└── README.md                 # This file
```

## Technical Details

### Permissions

- `webRequest`: Required to intercept network requests
- `storage`: Required to persist captured requests
- `activeTab`: Required for basic tab access

### Browser Compatibility

- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

### Performance

- Efficient request filtering (only processes m3u8 requests)
- Limited storage (maximum 1000 requests to prevent memory issues)
- Background processing to avoid UI blocking

## Customization

### Styling

The extension uses CSS custom properties for easy theming. Modify `popup/popup.css` to change:

- Color scheme
- Spacing and layout
- Typography
- Animations and transitions

### Functionality

- Modify `background/service-worker.js` to change capture logic
- Update `popup/popup.js` for UI behavior changes
- Adjust `manifest.json` for permission or configuration changes

## Development

### Prerequisites

- Modern web browser with Chrome DevTools
- Basic knowledge of JavaScript, HTML, and CSS
- Understanding of Chrome Extension APIs

### Local Development

1. Make changes to the source code
2. Go to `chrome://extensions/`
3. Click the refresh button on the StreamHelper extension
4. Test your changes

### Debugging

- Use Chrome DevTools on the popup (right-click extension icon → Inspect)
- Check the background service worker in the extensions page
- View console logs in the background script

## Icon Generation

The extension includes a utility HTML file (`generate_icons.html`) that can convert the SVG icon to PNG files of different sizes. To use:

1. Open `generate_icons.html` in a browser
2. Click on each generated icon to download the PNG file
3. Replace the placeholder icon files in the `icons/` folder

## Troubleshooting

### Common Issues

1. **Extension not capturing requests**
   - Check that the extension is enabled
   - Verify permissions are granted
   - Check browser console for errors

2. **Popup not loading**
   - Refresh the extension in `chrome://extensions/`
   - Check for JavaScript errors in popup DevTools

3. **Requests not persisting**
   - Verify Chrome storage permissions
   - Check if storage is full

### Debug Steps

1. Open `chrome://extensions/`
2. Find StreamHelper and click "Details"
3. Check "Errors" section for any issues
4. Use "Inspect views" to debug popup or background script

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or contributions:
- Create an issue on the repository
- Check the troubleshooting section above
- Review Chrome Extension documentation

## Changelog

### Version 1.0.0
- Initial release
- M3U8 request capture functionality
- Modern popup interface
- Search and filter capabilities
- Export functionality
- Real-time updates

---

**Note**: This extension is designed for legitimate use cases such as development, testing, and personal streaming analysis. Please ensure compliance with applicable laws and terms of service when using this tool.
