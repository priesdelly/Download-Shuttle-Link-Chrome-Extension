# Download Shuttle Link

**Languages:** [English](#download-shuttle-link) | [ไทย (Thai)](README_TH.md)

A Chrome/Edge extension that sends your downloads to the [Download Shuttle](https://apps.apple.com/app/download-shuttle-speed-boost/id847809913) app on macOS.

## Features

- 🚀 **Automatic interception** - Catches downloads before your browser handles them
- 📦 **30+ file types** - Archives, videos, documents, installers, and more
- 🎯 **Simple popup** - Click one button to send downloads to the app
- ⌨️ **Bypass with Alt key** - Hold Alt (Option) + Click to skip interception
- 🔒 **Private** - No data collection, everything stays local
- ⚡ **Fallback option** - Use browser download if Download Shuttle isn't available

## How It Works

**Simple flow:**
1. You click a download link
2. Extension intercepts it and shows a popup
3. You click "📥 Download Shuttle App"
4. Download Shuttle opens and starts downloading

**First time setup:** Your browser will ask permission to open Download Shuttle. Click "Always allow" for seamless future downloads.

## Installation

**Requirements:**
- Browser: Google Chrome, Microsoft Edge, Brave
- Download Shuttle app ([download here (App Store)](https://apps.apple.com/app/download-shuttle-speed-boost/id847809913))
- macOS 10.10+

### Recommended: Install from Chrome Web Store

The easiest way for regular users. One click, automatic updates.

1. Open the [Download Shuttle Link on the Chrome Web Store](https://chromewebstore.google.com/detail/download-shuttle-link/iklcibojkellbfhkbaagcpipiajhjonl)
2. Click **Add to Chrome**
3. Confirm by clicking **Add extension**
4. Done!

### Developer: Load unpacked

For developers who want to modify the source or test changes locally.

1. Download/clone this repository
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** → select the extension folder
5. Done!

## Usage

### Normal Download (via Download Shuttle)
1. Click any download link for a supported file type
2. A popup appears with download details
3. Click **"📥 Download Shuttle App"**
4. Download Shuttle opens and starts downloading

### Bypass Interception (Direct Browser Download)
**Hold Alt (Option ⌥) key while clicking** a download link to bypass the extension and download directly with your browser.

- **Alt + Click** = Direct browser download (no popup)
- **Normal Click** = Shows popup to send to Download Shuttle

**Fallback:** If Download Shuttle doesn't open, click the **"🌐 Browser Download"** button in the popup to download normally.

## Supported File Types

- **Archives:** `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`, `.xz`
- **Installers:** `.exe`, `.msi`, `.dmg`, `.pkg`, `.deb`, `.rpm`, `.apk`, `.ipa`
- **Documents:** `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`
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

⚠️ Roughly **80% of this project was vibe-coded** with **Claude Opus 4.7** (Anthropic). The remaining ~20% is hand-written review, integration, and manual testing.

## License

MIT License - Free to use, modify, and distribute

---

**Made with ❤️ for Download Shuttle users**
