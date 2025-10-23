# Development Guide

Technical documentation for developers working on the Download Shuttle Link extension.

## Quick Overview

**What this extension does:**
1. Monitors browser downloads
2. Intercepts supported file types
3. Shows a popup with download details
4. Sends URLs to Download Shuttle app via `downloadshuttle://` protocol

**Tech stack:**
- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- No build tools, no dependencies

---

## Architecture

```
User clicks download link
      ↓
content.js (Content Script)
  • Detects Alt key state
  • Sends bypass flag to background
      ↓
Browser Download Event
      ↓
background.js (Service Worker)
  • Detects download (async listener)
  • Checks bypass flag from storage
  • If bypassed → Allow browser download
  • If not bypassed → Check file type
      ↓
[If intercepted]
  • Cancels browser download
  • Opens popup window
      ↓
popup.html + popup.js
  • Shows download URL
  • Two buttons: "Send to App" | "Browser Download"
  • User clicks one
      ↓
Option 1: Download Shuttle        Option 2: Browser Download
  Protocol handler triggers         Falls back to normal download
  downloadshuttle://add/URL         Uses chrome.downloads API
      ↓
Download Shuttle App
  Receives URL and downloads
```

## Project Structure

```
Download Shuttle Link/
├── manifest.json          # Extension config & permissions
├── background.js          # Service worker (monitors downloads)
├── content.js             # Content script (tracks keyboard state)
├── popup.html             # Popup UI
├── popup.js               # Popup logic
├── icons/                 # Extension icons
├── README.md              # User documentation
└── DEVELOPMENT.md         # This file
```

### Key Files Explained

**`background.js`** - Service Worker
- Listens for downloads via `chrome.downloads.onCreated` (async listener)
- Checks bypass flag from `chrome.storage.local` before intercepting
- Checks if file type should be intercepted (by extension or MIME type)
- Cancels browser download with `chrome.downloads.cancel()`
- Opens popup window with `chrome.windows.create()`
- Stores download data in `chrome.storage.local`
- Handles messages from content script and popup

**`content.js`** - Content Script
- Runs on all pages to track keyboard state
- Detects Alt (Option) key press/release
- Sends bypass state to background via `chrome.runtime.sendMessage()`
- Captures keyboard state at click time for accurate detection
- No direct access to `chrome.storage` (must use messaging)

**`popup.js`** - Popup Logic
- Reads pending download from storage
- Displays download URL(s) in UI
- Handles two buttons:
  - **Send to Download Shuttle:** Creates protocol URL, triggers via `<a>` tag
  - **Browser Download:** Sends message to background to download via browser

**`popup.html`** - UI
- Simple gradient background
- Shows download URL
- Two action buttons
- Auto-closes after success

**`manifest.json`** - Configuration
- Permissions: `downloads`, `notifications`, `storage`
- Content scripts: Runs `content.js` on all URLs
- Uses Manifest V3 (service worker, not background page)

---

## How the Protocol Handler Works

### Protocol Format
```
downloadshuttle://add/<ENCODED_JSON_ARRAY>
```

### Example
```javascript
// 1. Start with URL(s)
const urls = ["https://example.com/file.zip"];

// 2. Convert to JSON and encode
const content = encodeURIComponent(JSON.stringify(urls));
// Result: %5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D

// 3. Create protocol URL
const protocolUrl = `downloadshuttle://add/${content}`;
// Result: downloadshuttle://add/%5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D

// 4. Set as link href
link.href = protocolUrl;

// 5. When user clicks the link, browser triggers Download Shuttle app
```

### Why User Click is Required

**Browser security:** Extensions cannot trigger custom protocols automatically. User must click a link to:
- Prevent malicious extensions from opening apps without permission
- Give users control over external app launches
- Follow same rules as regular web pages

**Our solution:** Use a real `<a href="...">` link that user clicks.

---

## Development Setup

### Prerequisites
- Chrome or Edge browser
- Download Shuttle app installed
- Text editor

### Installation
1. Clone the repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder

### Making Changes
1. Edit any file
2. Go to `chrome://extensions/`
3. Click reload icon on the extension
4. Test your changes

**No build process needed!** Pure vanilla JS, no dependencies.

---

## Testing

### Manual Test Flow
1. Find a test download (e.g., VLC: `https://get.videolan.org/vlc/3.0.21/macosx/vlc-3.0.21-arm64.dmg`)
2. Click the link
3. Popup should appear
4. Click "Send to Download Shuttle"
5. Download Shuttle should open

### Debugging

**Background script console:**
- Go to `chrome://extensions/`
- Find extension → Click "service worker"
- Console shows logs: `[Download Shuttle Link] ...`

**Popup console:**
- When popup opens, right-click → Inspect
- Console tab shows popup logs

**Test protocol manually:**
```javascript
// In browser console (F12)
window.location.href = 'downloadshuttle://add/%5B%22https%3A%2F%2Fexample.com%2Ftest.zip%22%5D';
// Should open Download Shuttle
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| CSP violation | Inline script | Move JS to external file |
| Protocol not working | Double encoding | Check encoding (only once) |
| Permission popup repeats | User didn't click "Always allow" | Click "Always allow" not "Allow" |
| Downloads not intercepted | File type not in list | Add to `FILE_EXTENSIONS` array |

---

## Code Style Guide

### JavaScript
```javascript
// ✅ Use ES6+ features
const urls = ['https://example.com/file.zip'];
const shouldIntercept = url => FILE_EXTENSIONS.some(ext => url.endsWith(ext));

// ✅ Add JSDoc comments
/**
 * Check if URL should be intercepted based on file extension
 * @param {string} url - The download URL
 * @returns {boolean} True if should be intercepted
 */
function shouldInterceptByExtension(url) {
  // ...
}

// ✅ Descriptive variable names
const browserDownloadIds = new Set();
const FILE_EXTENSIONS = ['.zip', '.rar', '.7z'];

// ✅ Console logs with prefix
console.log('[Download Shuttle Link] Intercepting:', url);
```

### HTML/CSS
- Use semantic HTML elements
- Keep styles inline in popup.html (no external CSS needed for small popup)
- Mobile-friendly responsive design

---

## Key Design Decisions

### Why Popup Window Instead of Tab?

**Old design:** Opened a new tab
**New design:** Opens a popup window
**Reason:** Less disruptive, cleaner UX, auto-closes gracefully

### Why Two Buttons?

**Button 1:** Send to Download Shuttle (primary action)
**Button 2:** Browser Download (fallback)
**Reason:** If Download Shuttle isn't installed or doesn't work, user has an escape route

### Why chrome.storage.local?

**Need:** Pass download data from background to popup
**Alternative:** URL hash (old method)
**Choice:** Storage is cleaner, supports multiple URLs, no encoding issues

### Why Track Browser Download IDs?

**Problem:** When user clicks "Browser Download", the background script would intercept it again
**Solution:** Store download IDs in `browserDownloadIds` Set, skip those in the interceptor

### Why Use Async Listener for Downloads?

```javascript
// ❌ Synchronous (old way)
chrome.downloads.onCreated.addListener((downloadItem) => {
  // Can't await storage operations
});

// ✅ Asynchronous (current way)
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const data = await chrome.storage.local.get(['bypassInterception']);
  // Now we can check bypass state before intercepting
});
```

**Reason:** Need to read bypass flag from storage before deciding to intercept. Async/await makes this clean and readable.

### Why Content Script Can't Access chrome.storage Directly?

**Manifest V3 restriction:** Content scripts run in isolated context
**Solution:** Use message passing via `chrome.runtime.sendMessage()`

**Communication flow:**
```javascript
// content.js (isolated context)
chrome.runtime.sendMessage({ action: 'setBypass', bypass: true });

// background.js (extension context)
chrome.runtime.onMessage.addListener((message) => {
  chrome.storage.local.set({ bypassInterception: message.bypass });
});
```

### Why Alt Key Instead of Cmd/Shift?

**Tested keyboard shortcuts:**
- ❌ **Cmd + Click** → Opens link in new tab (conflicts)
- ❌ **Shift + Click** → Opens link in new window (conflicts)
- ❌ **Cmd + Alt + Click** → Opens in new tab (Cmd has priority)
- ✅ **Alt + Click** → No browser default action (perfect!)

**Implementation:** Check for Alt only with no other modifiers:
```javascript
if (event.altKey && !event.metaKey && !event.shiftKey && !event.ctrlKey)
```

### Why 2-Second Timeout for Bypass State?

**Problem:** Bypass flag could stay active accidentally
**Solution:** Only honor bypass if set within 2 seconds of download start

```javascript
const timeSinceClick = Date.now() - lastClickTime;
if (bypassInterception && timeSinceClick < 2000) {
  // Bypass is fresh, honor it
}
```

**Prevents:** Stale bypass state from affecting unrelated downloads

---

## Contributing

### How to Contribute
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test thoroughly (try multiple file types)
5. Update documentation if needed
6. Submit pull request

### Bug Reports
Include:
- Browser version (Chrome/Edge)
- Extension version
- Steps to reproduce
- Console logs (background + popup)
- Screenshot if applicable

---

## Security & Privacy

### Permissions Explained
```json
{
  "downloads":      // Monitor and cancel downloads
  "notifications":  // Show error messages
  "tabs":          // Open popup window
  "scripting":     // Future use (currently unused)
  "storage":       // Store pending downloads
}
```

### No Data Collection
- ❌ No external network requests
- ❌ No tracking or analytics
- ❌ No user data stored permanently
- ✅ All processing is local
- ✅ Only talks to Download Shuttle app via protocol

### How Users Can Verify
1. Open `chrome://extensions/`
2. Find extension → View source files
3. Check Network tab (F12) - no external requests
4. Review `manifest.json` permissions

---

## License

MIT License - See LICENSE file

---

## Questions?

Open an issue on GitHub or contact the maintainer.
