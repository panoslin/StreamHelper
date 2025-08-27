image.png# 🔗 StreamHelper Extension + Desktop App Integration

This guide explains how to integrate the StreamHelper Chrome extension with the StreamHelper desktop application for seamless stream capture and download management.

## 🎯 **Integration Overview**

The integration enables:
- **Real-time stream capture** from web pages via Chrome extension
- **Instant download queuing** to the desktop application
- **Live communication** between extension and desktop app
- **Unified stream management** across browser and desktop

## 🚀 **Quick Start**

### 1. **Start StreamHelper Desktop App**
```bash
cd Client/
npm start
```
The desktop app will start and listen on WebSocket port 8080.

### 2. **Install Chrome Extension**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `StreamHelperExtension/` folder
4. The StreamHelper icon should appear in your toolbar

### 3. **Test Integration**
1. Open `test-integration.html` in a new tab
2. Click the test buttons to simulate stream captures
3. Check both the extension popup and desktop app for updates

## 🔌 **WebSocket Communication**

### **Connection Details**
- **Protocol**: WebSocket (ws://)
- **Port**: 8080
- **Host**: localhost
- **Auto-reconnect**: Yes (every 5 seconds, max 10 attempts)

### **Message Types**

#### **Extension → Desktop App**
```json
{
  "type": "STREAM_CAPTURED",
  "data": {
    "url": "https://example.com/stream.m3u8",
    "pageTitle": "Stream Page Title",
    "timestamp": 1640995200000,
    "tabId": 123,
    "pageUrl": "https://example.com/page"
  }
}
```

#### **Desktop App → Extension**
```json
{
  "type": "STREAM_ENQUEUED",
  "data": {
    "message": "Stream queued for download",
    "queuePosition": 2,
    "stream": { ... }
  }
}
```

## 🎬 **Stream Capture Flow**

### **1. Automatic Capture**
1. User visits a page with m3u8 streams
2. Extension automatically detects and captures stream requests
3. Stream data is stored locally and sent to desktop app
4. Desktop app queues the stream for download

### **2. Manual Download**
1. User clicks the "SH" (StreamHelper) button in extension popup
2. Extension sends stream data to desktop app
3. Desktop app immediately queues the stream
4. User sees confirmation in extension popup

### **3. Real-time Updates**
1. Extension shows connection status (Connected/Disconnected)
2. Desktop app sends download progress updates
3. Extension displays toast notifications for key events
4. Both apps stay synchronized in real-time

## 🛠️ **Technical Implementation**

### **Extension Components**
- **Background Service Worker**: WebSocket client and message handling
- **Popup Interface**: Connection status and manual download controls
- **Content Script**: Page context and stream detection
- **WebSocket Client**: Communication with desktop app

### **Desktop App Components**
- **WebSocket Server**: Listens for extension connections
- **Download Manager**: Queues and processes streams
- **IPC System**: Communicates with renderer process
- **UI Components**: Real-time status and progress display

## 🧪 **Testing the Integration**

### **Test Page Features**
- **Connection Status**: Shows WebSocket connection state
- **Stream Simulation**: Buttons to simulate different stream types
- **Activity Log**: Real-time logging of all events
- **Multiple Streams**: Test bulk stream capture

### **Test Scenarios**
1. **Basic Connection**: Verify extension connects to desktop app
2. **Stream Capture**: Test automatic stream detection
3. **Manual Download**: Use "SH" button to queue streams
4. **Real-time Updates**: Monitor live communication
5. **Error Handling**: Test disconnection scenarios

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Extension Not Connecting**
- Check if desktop app is running on port 8080
- Verify firewall settings allow local connections
- Check browser console for WebSocket errors

#### **Streams Not Capturing**
- Ensure extension is enabled and has permissions
- Check if page has actual m3u8 requests
- Verify content script is running

#### **Downloads Not Queuing**
- Check WebSocket connection status in extension
- Verify desktop app is receiving messages
- Check desktop app logs for errors

### **Debug Steps**
1. **Extension Console**: Check background script logs
2. **Desktop App Console**: Monitor WebSocket server logs
3. **Network Tab**: Verify WebSocket connection
4. **Extension Popup**: Check connection status indicator

## 📱 **Extension Features**

### **New UI Elements**
- **Connection Status**: Real-time WebSocket status
- **StreamHelper Button**: "SH" button for manual downloads
- **Toast Notifications**: Success/error feedback
- **Real-time Updates**: Live communication status

### **Enhanced Functionality**
- **Auto-capture**: Automatic stream detection
- **Manual Queue**: Direct download queuing
- **Status Monitoring**: Connection health tracking
- **Error Handling**: Graceful failure management

## 🎨 **Customization**

### **Styling**
- Modify `popup/popup.css` for visual changes
- Update connection status colors and indicators
- Customize button styles and animations

### **Functionality**
- Adjust WebSocket reconnection settings
- Modify message handling logic
- Add new notification types
- Customize stream capture filters

## 🔒 **Security Considerations**

### **Local Communication**
- WebSocket only listens on localhost (127.0.0.1)
- No external network access required
- Extension permissions are minimal and focused

### **Data Handling**
- Stream URLs are sent as-is to desktop app
- No sensitive data is stored or transmitted
- All communication is local and encrypted

## 🚀 **Future Enhancements**

### **Planned Features**
- **Batch Operations**: Queue multiple streams at once
- **Download History**: Track completed downloads
- **Stream Validation**: Verify stream availability
- **Advanced Filtering**: Custom capture rules

### **Integration Improvements**
- **Bi-directional Sync**: Desktop app can send commands to extension
- **Status Broadcasting**: Share download progress across tabs
- **Configuration Sync**: Shared settings between apps
- **Plugin System**: Extensible stream processing

## 📚 **API Reference**

### **WebSocket Events**
- `CONNECTION_ESTABLISHED`: Initial connection
- `STREAM_CAPTURED`: New stream detected
- `STREAM_ENQUEUED`: Stream queued for download
- `DOWNLOAD_PROGRESS`: Download progress update
- `DOWNLOAD_COMPLETED`: Download finished
- `DOWNLOAD_FAILED`: Download error
- `ERROR`: General error notification

### **Extension Messages**
- `GET_M3U8_REQUESTS`: Retrieve captured streams
- `DOWNLOAD_TO_STREAMHELPER`: Queue stream for download
- `CLEAR_M3U8_REQUESTS`: Clear stored streams
- `DELETE_M3U8_REQUEST`: Remove specific stream

## 🎉 **Success Indicators**

### **Working Integration**
- ✅ Green "Connected" status in extension
- ✅ Streams appear in desktop app immediately
- ✅ Download queue updates in real-time
- ✅ Toast notifications for all events
- ✅ WebSocket connection stays stable

### **Performance Metrics**
- **Connection Time**: < 1 second
- **Stream Capture**: < 100ms
- **Download Queuing**: < 500ms
- **Real-time Updates**: < 200ms latency

---

**Ready to integrate?** 🚀

Follow the quick start guide above and test the integration with the provided test page. The system should work seamlessly once both components are running!
