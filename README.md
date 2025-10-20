# Download Shuttle Link

A Chrome/Edge extension that sends your downloads to the [Download Shuttle](http://fiplab.com) app on macOS.

## Features

- 🚀 **Automatic interception** - Catches downloads before your browser handles them
- 📦 **30+ file types** - Archives, videos, documents, installers, and more
- 🎯 **Simple popup** - Click one button to send downloads to the app
- 🔒 **Private** - No data collection, everything stays local
- ⚡ **Fallback option** - Use browser download if Download Shuttle isn't available

## How It Works

**Simple flow:**
1. You click a download link
2. Extension intercepts it and shows a popup
3. You click "Send to Download Shuttle"
4. Download Shuttle opens and starts downloading

**First time setup:** Your browser will ask permission to open Download Shuttle. Click "Always allow" for seamless future downloads.

## Installation

**Requirements:**
- Chrome or Edge browser
- Download Shuttle app ([download here](http://fiplab.com))
- macOS 10.10+

**Steps:**
1. Download/clone this repository
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** → select the extension folder
5. Done!

## Usage

1. Click any download link for a supported file type
2. A popup appears with download details
3. Click **"📥 Send to Download Shuttle"**
4. Download Shuttle opens and starts downloading

**Fallback:** If Download Shuttle doesn't open, click **"Browser Download"** to download normally.

## Supported File Types

- **Archives:** `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`, `.xz`
- **Installers:** `.exe`, `.msi`, `.dmg`, `.pkg`, `.deb`, `.rpm`, `.apk`, `.ipa`
- **Documents:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`
- **Videos:** `.mp4`, `.mkv`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`
- **Audio:** `.mp3`, `.wav`, `.flac`, `.aac`, `.ogg`, `.m4a`
- **Other:** `.iso`, `.img`, `.bin`, `.torrent`

## Privacy & Security

- ✅ **No tracking** - No data collection, no analytics
- ✅ **No servers** - Everything runs locally in your browser
- ✅ **Open source** - All code is visible and auditable
- ✅ **Minimal permissions** - Only what's needed to work

**How to verify:** Check the code at `chrome://extensions/` → Details → View installation path. The key files are `background.js`, `popup.js`, and `manifest.json`.

## Troubleshooting

**Download Shuttle doesn't open?**
- Make sure Download Shuttle is installed and opened at least once
- Click "Always allow" when browser asks for permission
- Try the "Browser Download" button as fallback

**Downloads still go to browser?**
- Check if the file type is supported (see list above)
- Verify the extension is enabled at `chrome://extensions/`

**Permission popup every time?**
- Click "Always allow" instead of "Allow" to remember your choice

## Technical Details

Want to understand how it works or contribute? See [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Architecture overview
- How the protocol handler works
- Development setup
- Testing guide

## Disclaimer

⚠️ **Unofficial extension** - Not affiliated with FIPLAB Ltd. (creators of Download Shuttle)

⚠️ This project contains a significant amount of code written using the **Vibe coding** methodology

## License

MIT License - Free to use, modify, and distribute

---

**Made with ❤️ for Download Shuttle users**
