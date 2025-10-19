# Download Shuttle Link

Unofficial Chrome/Edge extension that automatically sends downloads to the [Download Shuttle](http://fiplab.com) macOS app.

## Features

- 🚀 Automatic download interception
- 📦 Supports 30+ file types (archives, videos, documents, installers, etc.)
- 🔗 Direct integration with Download Shuttle via custom URL protocol
- 🎯 One-click download forwarding
- 🔒 Privacy-focused: no data collection, all processing happens locally

## How It Works

When you click a download link in your browser:

1. **Interception**: The extension detects the download and cancels the browser's default download
2. **Redirect Page**: Opens a new tab showing the download URL and a confirmation button
3. **User Action Required**: You click the "📥 Send to Download Shuttle" button
4. **Protocol Handler**: The custom `downloadshuttle://` URL protocol is triggered
5. **Download Shuttle Opens**: The Download Shuttle app receives the download URL and starts downloading

### Why User Interaction is Required

Due to browser security policies, custom URL protocol handlers (like `downloadshuttle://`) cannot be triggered automatically by extensions without user interaction. This is a security feature to prevent malicious extensions from opening external applications without permission.

**The first time you click the button**, your browser will ask for permission to open Download Shuttle. After you allow it once, subsequent downloads will work seamlessly.

## Installation

### Requirements

- Chrome or Microsoft Edge browser
- Download Shuttle app installed on macOS
- macOS 10.10 or later

### Install from Source

1. **Download or clone** this repository
2. **Install Download Shuttle** from [fiplab.com](http://fiplab.com)
3. **Open your browser's extensions page**:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
4. **Enable Developer Mode** (toggle in top-right corner)
5. **Click "Load unpacked"** and select the extension folder
6. **Grant permissions** when prompted

## Usage

1. **Click any download link** in your browser (supported file types only)
2. **A new tab opens** showing the download details
3. **Click "📥 Send to Download Shuttle"**
4. **Allow the protocol handler** (first time only)
5. **Download Shuttle opens** and starts downloading!

The redirect page will automatically close after a few seconds.

## Supported File Types

### Archives
`.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`, `.xz`

### Installers
`.exe`, `.msi`, `.dmg`, `.pkg`, `.deb`, `.rpm`, `.apk`, `.ipa`

### Documents
`.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`

### Videos
`.mp4`, `.mkv`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`

### Audio
`.mp3`, `.wav`, `.flac`, `.aac`, `.ogg`, `.m4a`

### Other
`.iso`, `.img`, `.bin`, `.torrent`

## Privacy & Security

- ✅ **No data collection or tracking** - Your download URLs are never sent to any server
- ✅ **No external API calls** - Everything runs locally in your browser
- ✅ **Open source** - You can review all the code before installing
- ✅ **Minimal permissions** - Only requests necessary permissions

### How to Review the Code

This extension is fully open source. You can inspect the code to verify it's safe:

1. **View files in your browser's extension page**:
   - Go to `chrome://extensions/` or `edge://extensions/`
   - Find "Download Shuttle Link"
   - Click "Details"
   - Scroll down and you'll see the installation path
   - Open that folder to view all source files

2. **Key files to review**:
   - `background.js` - Main extension logic (monitors downloads)
   - `redirect.js` - Handles the button click and protocol URL
   - `redirect.html` - The confirmation page you see
   - `manifest.json` - Extension permissions and configuration

3. **What the code does**:
   - Monitors downloads via Chrome's downloads API
   - Cancels matching downloads (by file type)
   - Opens a page with your download URL
   - When you click, passes the URL to Download Shuttle app
   - **No network requests, no tracking, no data collection**

## Troubleshooting

### Download Shuttle doesn't open

1. Make sure Download Shuttle is installed and has been opened at least once
2. Check if your browser asked for permission to open Download Shuttle (look for a popup)
3. Try clicking "Allow" or "Always allow" when prompted
4. Restart your browser after installation

### Downloads still go to browser

1. Check if the file type is in the supported list above
2. Make sure the extension is enabled in `chrome://extensions/` or `edge://extensions/`
3. Check browser console (F12 → Console) for error messages

### Permission popup keeps appearing

This is normal browser behavior. Click "Always allow" to stop seeing the popup for future downloads.

## Development

Interested in contributing or building your own version? See [DEVELOPMENT.md](DEVELOPMENT.md) for technical details, architecture, and development guidelines.

## Disclaimer

⚠️ This is an **unofficial, community-developed** extension. Not affiliated with or endorsed by FIPLAB Ltd., the creators of Download Shuttle.

## License

MIT License - feel free to modify and distribute.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

Made with ❤️ for Download Shuttle users
