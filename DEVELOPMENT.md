# Development Guide

**Languages:** [English](#development-guide) | [ไทย (Thai)](DEVELOPMENT_TH.md)

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
User clicks a download link
      ↓
Browser fires the download
      ↓
background.js — chrome.downloads.onCreated (async)
  1. Is this URL in our "browser download" guard list? → allow
  2. Ask content.js: "is Alt held right now?" → if yes, allow
  3. Does the URL extension or MIME type match? → if no, allow
  4. Otherwise: cancel + erase the native download, store the
     pending download info in chrome.storage.session, open popup
      ↓
popup.html + popup.js
  • Reads pending download from chrome.storage.session
  • Two buttons:
      Option 1: "📥 Download Shuttle App"   Option 2: "🌐 Browser Download"
      ↓                                     ↓
  Triggers the downloadshuttle://         Sends a "browserDownload" message
  link via a real <a> click. The OS       to background. Background marks the
  hands the URL to the Download           URLs in its guard list FIRST, then
  Shuttle app.                            calls chrome.downloads.download() —
                                          the onCreated handler sees the URL
                                          in the guard list and lets it pass.
```

## Project Structure

```
DownloadShuttleLink-Chrome/
├── src/
│   ├── manifest.json     # Extension config & permissions
│   ├── background.js     # Service worker (intercepts downloads)
│   ├── content.js        # Content script (tracks Alt key state)
│   ├── popup.html        # Popup UI
│   ├── popup.js          # Popup logic
│   └── icons/            # Extension icons
├── README.md             # User documentation (English)
├── README_TH.md          # User documentation (Thai)
├── DEVELOPMENT.md        # This file
├── DEVELOPMENT_TH.md     # Thai translation of this file
└── privacy-policy.md     # Privacy policy
```

**Load unpacked:** point Chrome at the `src/` folder (not the repo root) — the manifest lives in `src/`.

### Key Files Explained

**`background.js`** — Service Worker
- Owns the `chrome.downloads.onCreated` listener (async)
- Decides whether to intercept based on URL pathname extension, MIME type, the Alt key, and the re-entry guard
- Cancels the native download with `chrome.downloads.cancel`
- Opens the popup window with `chrome.windows.create`
- Handles `browserDownload` messages from the popup

**`content.js`** — Content Script
- Runs on every page at `document_start`
- Tracks Alt (Option) key state in a module-level variable
- Replies to `{ action: 'checkAltKey' }` messages from background
- Guards `chrome.runtime?.id` because the runtime can be invalidated when the extension reloads while a page is still open

**`popup.js`** — Popup Logic
- Reads `pendingDownload` from `chrome.storage.session`
- Auto-closes if the entry is older than 5 minutes
- Auto-closes immediately if no entry is present (means the popup was restored by the browser on restart)
- Wires up the two action buttons; buttons start `disabled` and are enabled only after storage loads

**`popup.html`** — UI
- Gradient background, inline styles
- Two buttons, both initially `disabled`
- The "Download Shuttle App" button lives inside an `<a id="sendLink">` so the click can trigger the custom protocol

**`manifest.json`** — Configuration
- Manifest V3 (service worker)
- Permissions: `downloads`, `storage`
- Host permissions: `http://*/*`, `https://*/*` (for the content script)

---

## Cross-cutting Invariants

These rules cut across files and are easy to break accidentally.

### 1. Session storage only, never local

`pendingDownload` and `browserDownloadUrls` both live in `chrome.storage.session`, never in `chrome.storage.local`. Session storage auto-clears on browser close, which prevents a stale popup from appearing the next time the browser starts.

### 2. The re-entry guard is URL-based and lives in storage

When the popup's "Browser Download" button is clicked, background must:
1. Add the URLs to `chrome.storage.session` under `browserDownloadUrls` **first**
2. Only then call `chrome.downloads.download()`

If the guard were in memory only, the service worker could be killed between step 2 and the eventual `onCreated` event, losing the guard and causing the extension to intercept its own download in an infinite loop.

If the guard were keyed by download ID, the `onCreated` event might fire before `download()`'s callback returns the ID — another race.

### 3. The `onCreated` listener stays `async`

It awaits the message round-trip to the content script for Alt key state. Don't make it synchronous.

### 4. Alt-only modifier for bypass

`event.altKey && !event.metaKey && !event.shiftKey && !event.ctrlKey`. Cmd/Shift/Ctrl all conflict with browser link defaults on macOS (open in new tab, open in new window, etc.).

### 5. The popup click on `downloadshuttle://` must be a real user click

Browsers forbid extensions from navigating to a custom-protocol URL programmatically. The popup uses an `<a href="downloadshuttle://...">` element and lets the natural anchor click handle the protocol invocation.

---

## Storage Keys

All keys live in `chrome.storage.session`.

| Key | Type | Set by | Read by | Purpose |
|-----|------|--------|---------|---------|
| `pendingDownload` | `{ urls, protocolUrl, timestamp }` | background (before opening popup) | popup (on startup) | Pass the intercepted download to the popup |
| `browserDownloadUrls` | `string[]` | background (before `chrome.downloads.download`) | background (in `onCreated`) | Re-entry guard — URLs we started ourselves and must not re-intercept |

---

## How the Protocol Handler Works

### Protocol Format

```
downloadshuttle://add/<ENCODED_JSON_ARRAY>
```

### Example

```javascript
const urls = ['https://example.com/file.zip'];

// JSON-encode, then URL-encode once.
const payload = encodeURIComponent(JSON.stringify(urls));
// payload === '%5B%22https%3A%2F%2Fexample.com%2Ffile.zip%22%5D'

const protocolUrl = 'downloadshuttle://add/' + payload;
link.href = protocolUrl;
// When the user clicks the link, the OS hands it to Download Shuttle.
```

### Why User Click Is Required

Browser security: extensions cannot trigger custom protocols programmatically. The only way to invoke `downloadshuttle://` is via a real user click on a link. We use an `<a>` element whose `href` we set before the click happens.

---

## Adding New File Types

Edit [src/background.js](src/background.js):

- `FILE_EXTENSIONS` — matched against the URL pathname (lowercased). Includes the leading dot, e.g. `'.zip'`.
- `MIME_TYPES` — matched against `downloadItem.mime` (lowercased).

A download is intercepted if **either** match succeeds.

Avoid `application/octet-stream` — many servers use it as a generic fallback for unknown binaries, which would cause over-eager interception.

---

## Development Setup

### Prerequisites
- Chrome or Edge browser
- Download Shuttle app installed (for end-to-end testing)
- Any text editor

### Installation
1. Clone the repository
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `src/` folder

### Making Changes
1. Edit any file in `src/`
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension
4. Test your changes

**No build process needed.** Pure vanilla JS, no dependencies.

---

## Debugging

**Background script console:**
- `chrome://extensions/` → find the extension → click "service worker"
- Logs are prefixed `[Download Shuttle Link] ...`

**Popup console:**
- Right-click the popup → Inspect

**Test the protocol manually:**
```javascript
// In any page's DevTools console
window.location.href = 'downloadshuttle://add/%5B%22https%3A%2F%2Fexample.com%2Ftest.zip%22%5D';
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Protocol does nothing | Double encoding | Encode exactly once with `encodeURIComponent(JSON.stringify(urls))` |
| Permission prompt every time | User clicked "Allow", not "Always allow" | Click "Always allow" |
| Downloads not intercepted | File type missing | Add to `FILE_EXTENSIONS` or `MIME_TYPES` |
| Extension intercepts the fallback download | Re-entry guard not set before `download()` | Always `await addBrowserDownloadUrls(urls)` before `chrome.downloads.download()` |
| Popup reopens after browser restart | Stored in `chrome.storage.local` | Must be `chrome.storage.session` |
| Content script errors after extension reload | Stale context on existing pages | Guard with `chrome.runtime?.id` before using chrome APIs |

---

## Key Design Decisions

### Why a popup window instead of a tab?

Less disruptive, cleaner UX, easy to auto-close. A tab would persist in the user's tab list until they noticed it.

### Why two buttons?

The Download Shuttle protocol can fail silently — the app might not be installed, or the user might dismiss the OS permission prompt. The "Browser Download" button is the escape hatch.

### Why `chrome.storage.session` over `chrome.storage.local`?

`local` survives browser restarts. If the user closes the browser with an unhandled download, the popup would reopen on the next launch with stale data. `session` clears on browser close, which is exactly what we want for transient handoff data.

### Why the re-entry guard tracks URLs (not download IDs) in storage (not memory)?

Two failure modes the URL-in-storage approach avoids:

1. **In-memory + ID:** `chrome.downloads.onCreated` may fire before `chrome.downloads.download`'s callback returns the new download ID. The guard wouldn't be in place yet, and we'd intercept our own download.
2. **In-memory + URL:** Same race plus MV3 service workers get killed when idle (~30s). The Set would be lost on restart.

URL-in-session-storage is set before `download()` is called and persists across worker restarts.

### Why use an `async` listener for `onCreated`?

We need to await the message round-trip to the content script for the Alt key state:

```javascript
chrome.downloads.onCreated.addListener(async function (downloadItem) {
  const altPressed = await isAltKeyPressed();
  // ...
});
```

A sync listener would have to make the intercept decision without knowing whether the user is holding Alt.

### Why does the content script use messages instead of `chrome.storage` directly?

The content script *can* access `chrome.storage`, but a write/read round-trip is too slow for the "is Alt currently held?" question. Direct messaging gives the background script the live state at the moment of decision.

Note: content scripts share message-passing APIs with the extension, but they run in an isolated JS world from the page's own scripts.

### Why Alt instead of Cmd/Shift/Ctrl for the bypass?

Tested on macOS Chrome:

- **Cmd + Click** → opens in a new tab (conflict)
- **Shift + Click** → opens in a new window (conflict)
- **Ctrl + Click** → opens the context menu (conflict)
- **Alt + Click** → no default browser action (clean)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test thoroughly (try multiple file types, with and without Alt held, with and without the Shuttle app open)
5. Update documentation if the user-facing behavior or invariants change
6. Submit a pull request

### Bug Reports

Include:
- Browser (Chrome/Edge) version
- Extension version (from `manifest.json`)
- Steps to reproduce
- Background + popup console logs
- Screenshot if applicable

---

## Security & Privacy

### Permissions Explained

```json
{
  "downloads":  // Monitor, cancel, and erase downloads
  "storage"     // Pass pending downloads between background and popup
                // (session-scoped — clears on browser close)
}
```

Plus host permissions on `http://*/*` and `https://*/*` so the content script can observe the Alt key on every page.

### No Data Collection

- No external network requests
- No tracking or analytics
- No data persisted beyond the current browser session
- All processing is local; only talks to Download Shuttle via the OS protocol handler

### How Users Can Verify

1. `chrome://extensions/` → find the extension → view source files
2. DevTools Network tab — no outgoing requests
3. Review `manifest.json` permissions

---

## License

MIT License — see LICENSE file

---

## Questions?

Open an issue on GitHub or contact the maintainer.
