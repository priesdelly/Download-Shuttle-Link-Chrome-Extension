# Privacy Policy

**Last Updated:** May 25, 2026

## No Data Collection

Download Shuttle Link does not collect, store, or transmit any personal data. The extension operates entirely locally on your device.

## What We Don't Do

- No tracking or analytics
- No data sent to external servers
- No browsing history collected
- No personal information stored

## What the Extension Does

- Intercepts download links for supported file types and offers to redirect them to the Download Shuttle app
- Temporarily stores the pending download URL in `chrome.storage.session` so the popup can read it (auto-cleared when you close the browser)

All operations happen on your device. Nothing leaves your computer.

## Permissions

- **Downloads**: To intercept and redirect downloads
- **Storage**: To pass the pending download URL between the background script and the popup (session-scoped only)
- **Host Permissions** (`http://*/*`, `https://*/*`): So the content script can observe the Alt (Option) key for the bypass shortcut

## Contact

Questions? Open an issue at: https://github.com/priesdelly/Download-Shuttle-Link-Chrome-Extension/issues
