# 🚀 Quick Installation Guide - StreamHelper

## ⚡ Fast Setup (2 minutes)

### Step 1: Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. **Enable "Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the **`StreamHelper`** folder
5. ✅ Extension is now installed!

### Step 2: Test the Extension
1. Click the **StreamHelper icon** in your Chrome toolbar
2. Open `test-page.html` in a new tab
3. Click the test buttons to simulate m3u8 requests
4. Watch requests appear in the extension popup!

## 🔧 What You Get

- **Real-time M3U8 capture** from all websites
- **Modern, clean interface** with Material Design
- **Smart URL display** with truncation and full URL viewing
- **Search & filter** captured requests
- **One-click URL copying** to clipboard
- **yt-dlp integration** for easy download commands
- **Export functionality** to JSON
- **Request management** (delete, clear all)

## 🎯 How It Works

1. **Background monitoring** - Extension watches all network traffic
2. **Smart filtering** - Only captures `.m3u8` requests
3. **Context capture** - Records page title, URL, timestamp
4. **Real-time updates** - New requests appear immediately
5. **Persistent storage** - Requests saved between sessions

## 🧪 Testing

Use the included `test-page.html` to:
- Simulate different types of m3u8 requests
- Verify the extension is working correctly
- Test all features before using on real sites

## 🚨 Troubleshooting

**Extension not working?**
- Check `chrome://extensions/` for errors
- Ensure "Developer mode" is enabled
- Try refreshing the extension

**No requests captured?**
- Visit a site with streaming content
- Check browser console for errors
- Verify extension permissions

## 📱 Usage Tips

- **Click the extension icon** to open the popup
- **Use search** to find specific requests
- **Copy URLs** with the copy button
- **Export data** for analysis
- **Clear old requests** to save space

## 🎨 Customization

The extension uses CSS variables for easy theming:
- Edit `popup/popup.css` to change colors
- Modify `manifest.json` for permissions
- Update `background/service-worker.js` for capture logic

---

**Ready to capture some streams?** 🎬

The extension is now active and will automatically capture m3u8 requests as you browse!
