# Development Guide

This document contains technical details, architecture information, and development guidelines for the Download Shuttle Link extension.

## Table of Contents

- [Architecture](#architecture)
- [Technical Details](#technical-details)
- [Project Structure](#project-structure)
- [How the Protocol Works](#how-the-protocol-works)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Code Style](#code-style)
- [Contributing](#contributing)

## Architecture

The extension follows a simple architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Downloads                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│              background.js (Service Worker)             │
│  • Monitors chrome.downloads.onCreated                  │
│  • Checks file type/MIME type                           │
│  • Cancels browser download                             │
│  • Opens redirect page                                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│         redirect.html + redirect.js (UI Page)           │
│  • Displays download URL                                │
│  • Shows confirmation button                            │
│  • Button is a real <a> link with protocol URL          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓ (User clicks)
┌─────────────────────────────────────────────────────────┐
│            Browser Protocol Handler                     │
│  • Asks for permission (first time)                     │
│  • Opens Download Shuttle app                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│              Download Shuttle App                       │
│  • Receives downloadshuttle://add/URL                   │
│  • Starts downloading the file                          │
└─────────────────────────────────────────────────────────┘
```

## Technical Details

### Manifest V3

This extension uses Manifest V3, which is the current standard for Chrome extensions:

- **Service Worker** instead of background pages
- **Declarative permissions** instead of broad permissions
- **Content Security Policy** enforced (no inline scripts)

### Why User Interaction is Required

Browser security policies prevent extensions from triggering custom protocol handlers without user interaction. This is by design to prevent malicious extensions from:

1. Opening external applications without permission
2. Potentially executing code via protocol handlers
3. Phishing or social engineering attacks

**Our solution:** Use a real `<a href="protocol://...">` link that the user clicks directly. This is the same approach used in regular web pages.

### Content Security Policy (CSP)

The extension follows strict CSP rules:

- ❌ No inline scripts (`<script>...</script>`)
- ❌ No inline event handlers (`onclick="..."`)
- ❌ No `eval()` or similar dynamic code execution
- ✅ All JavaScript in external files
- ✅ Event listeners attached via `addEventListener()`

## Project Structure

```
Download Shuttle Link/
├── background.js          # Service worker (main logic)
├── redirect.html          # User confirmation page
├── redirect.js            # Redirect page logic
├── manifest.json          # Extension configuration
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # User documentation
└── DEVELOPMENT.md         # This file
```

### File Descriptions

#### `background.js`
- **Type:** Service Worker (persistent background script)
- **Purpose:** Monitors downloads and intercepts supported file types
- **Key Functions:**
  - `shouldInterceptByExtension(url)` - Check file extension
  - `shouldInterceptByMime(mimeType)` - Check MIME type
  - `sendToDownloadShuttle(links)` - Open redirect page
- **Event Listeners:**
  - `chrome.downloads.onCreated` - Detects new downloads

#### `redirect.js`
- **Type:** Regular JavaScript file
- **Purpose:** Handles redirect page logic and protocol URL
- **Key Functions:**
  - `parseAndDisplayUrls()` - Extract and show download URLs
  - `setupDownloadLink()` - Configure the protocol link
  - `handleLinkClick()` - Show feedback on click
- **No automatic triggers** - All actions require user click

#### `redirect.html`
- **Type:** HTML page
- **Purpose:** User interface for download confirmation
- **Key Elements:**
  - Download URL display
  - Confirmation button (wrapped in `<a>` tag)
  - Loading spinner
  - Success message

#### `manifest.json`
- **Type:** JSON configuration
- **Purpose:** Extension metadata and permissions
- **Key Sections:**
  - `permissions` - Required browser APIs
  - `web_accessible_resources` - Files accessible to extension pages
  - `background.service_worker` - Background script configuration

## How the Protocol Works

### Protocol Format

```
downloadshuttle://add/ENCODED_JSON_ARRAY
```

### Encoding Process

```javascript
// 1. Create array of URLs
const urls = ["https://example.com/file.zip"];

// 2. Convert to JSON string
const json = JSON.stringify(urls);
// Result: ["https://example.com/file.zip"]

// 3. URL encode the JSON
const encoded = encodeURIComponent(json);
// Result: %5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D

// 4. Create protocol URL
const protocolUrl = `downloadshuttle://add/${encoded}`;
// Result: downloadshuttle://add/%5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D
```

### Important: No Double Encoding

**Problem we solved:** Originally, the code was double-encoding:

```javascript
// ❌ WRONG - Double encoding
const protocolUrl = `downloadshuttle://add/${encoded}`;
const hash = '#' + encodeURIComponent(protocolUrl); // Encoded AGAIN
const pageUrl = 'redirect.html' + hash;
```

**Solution:** Pass the protocol URL directly in the hash:

```javascript
// ✅ CORRECT - Single encoding
const protocolUrl = `downloadshuttle://add/${encoded}`;
const hash = '#' + protocolUrl; // NOT encoded again
const pageUrl = 'redirect.html' + hash;
```

Then in `redirect.js`:
```javascript
// Extract from hash without decoding
const protocolUrl = window.location.hash.substring(1);
// Use directly as link href
link.href = protocolUrl;
```

## Development Setup

### Prerequisites

- Node.js (for any build tools, optional)
- Chrome or Edge browser
- Download Shuttle app installed on macOS

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd "Download Shuttle Link"
   ```

2. **Load in browser:**
   - Open `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension folder

3. **Make changes:**
   - Edit files directly
   - Click the reload icon in the extensions page
   - Test your changes

### No Build Process

This extension uses vanilla JavaScript with no build tools:
- ✅ No webpack/rollup/vite
- ✅ No transpilation
- ✅ No dependencies
- ✅ Edit and reload

## Testing

### Manual Testing

1. **Test with VLC download:**
   ```
   https://get.videolan.org/vlc/3.0.21/macosx/vlc-3.0.21-arm64.dmg
   ```

2. **Check console logs:**
   - Background page: `chrome://extensions/` → Click "service worker" link
   - Redirect page: Open the redirect page, press F12 → Console
   - Look for `[Download Shuttle Link]` prefixed messages

3. **Verify the complete flow:**
   - Click download link → Extension intercepts
   - Redirect page opens → See download URL displayed
   - Click "Send to Download Shuttle" button → Browser asks permission (first time)
   - Allow permission → Download Shuttle opens
   - Page closes automatically

4. **Test protocol URL manually:**
   - Open browser console (F12)
   - Run: `window.location.href = 'downloadshuttle://add/%5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D'`
   - Download Shuttle should open

### Debugging

**Background script logs:**
```bash
# Chrome/Edge extensions page → Service worker → Console
[Download Shuttle Link] Download detected: https://...
[Download Shuttle Link] MIME type: application/octet-stream
[Download Shuttle Link] Intercepting download
```

**Redirect page logs:**
```bash
# F12 → Console on redirect page
[Download Shuttle Link] Protocol URL: downloadshuttle://add/...
[Download Shuttle Link] Link href set to: downloadshuttle://add/...
[Download Shuttle Link] Link clicked - Download Shuttle should open
```

### Common Issues During Development

1. **CSP violations:**
   - Error: "Refused to execute inline script"
   - Fix: Move all JavaScript to external files

2. **Protocol not triggering:**
   - Error: Nothing happens when clicking
   - Fix: Ensure link href is set correctly, check for double encoding

3. **Permission popup every time:**
   - Not an error - browser security feature
   - Fix: User must click "Always allow"

## Code Style

### JavaScript

- **Use ES6+ features:** const/let, arrow functions, template literals
- **Add JSDoc comments** for all functions
- **Use descriptive variable names**
- **Group related code with comment headers**

```javascript
/**
 * Check if URL should be intercepted based on file extension
 * @param {string} url - The download URL
 * @returns {boolean} True if URL should be intercepted
 */
function shouldInterceptByExtension(url) {
  const urlLower = url.toLowerCase();
  return FILE_EXTENSIONS.some(ext => urlLower.endsWith(ext));
}
```

### HTML/CSS

- **Semantic HTML** elements
- **BEM-style CSS** or similar methodology
- **Responsive design** (though extension pages are usually fixed)
- **Accessibility** considerations

### Logging

Always prefix logs with `[Download Shuttle Link]`:

```javascript
console.log('[Download Shuttle Link] Sending:', validLinks);
console.warn('[Download Shuttle Link] No links to send');
console.error('[Download Shuttle Link] Error:', error);
```

## Contributing

### Pull Request Process

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/my-feature`
3. **Make your changes**
4. **Test thoroughly** - Try multiple file types
5. **Update documentation** if needed
6. **Submit pull request** with clear description

### Feature Ideas

- [ ] Support for multiple simultaneous downloads
- [ ] Settings page for customizing file types
- [ ] Download history
- [ ] Keyboard shortcuts
- [ ] Chrome extension store listing

### Bug Reports

Please include:
- Browser version (Chrome/Edge)
- Extension version
- Steps to reproduce
- Console logs (F12 → Console)
- Screenshot if applicable

## Security Considerations

### Permissions Required

```json
{
  "permissions": [
    "downloads",      // Monitor and cancel downloads
    "notifications",  // Show error/success messages
    "tabs",          // Open redirect page
    "scripting"      // (Currently unused, can be removed)
  ]
}
```

### No Data Collection

The extension:
- ❌ Does NOT send URLs to any server
- ❌ Does NOT track user behavior
- ❌ Does NOT use analytics
- ✅ Processes everything locally
- ✅ Only communicates with Download Shuttle app via protocol

### Audit the Code

Users can verify this by:
1. Reviewing source files (all JavaScript is readable)
2. Checking Network tab (F12 → Network) - no external requests
3. Reading manifest.json permissions

## License

MIT License - See LICENSE file for details

---

Questions? Open an issue on GitHub or contact the maintainer.
