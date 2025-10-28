/**
 * Download Shuttle Link - Background Service Worker
 *
 * Monitors browser downloads, intercepts supported file types, and redirects
 * them to the Download Shuttle app via a custom protocol.
 */

// Track downloads initiated by browser download button (should not be intercepted)
const browserDownloadIds = new Set();

const FILE_EXTENSIONS = [
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
  '.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.apk', '.ipa',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
  '.iso', '.img', '.bin', '.torrent'
];

const MIME_TYPES = [
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
  'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
  'application/octet-stream', 'application/x-msdownload', 'application/x-apple-diskimage',
  'application/pdf', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4', 'video/x-matroska', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv',
  'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg'
];

function shouldInterceptByExtension(url) {
  const urlLower = url.toLowerCase();
  return FILE_EXTENSIONS.some(ext => urlLower.endsWith(ext));
}

function shouldInterceptByMime(mimeType) {
  if (!mimeType) return false;
  return MIME_TYPES.includes(mimeType.toLowerCase());
}

function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

async function sendToDownloadShuttle(links) {
  if (!links || links.length === 0) return;

  const validLinks = links.filter(isValidUrl);
  if (validLinks.length === 0) return;

  try {
    const content = encodeURIComponent(JSON.stringify(validLinks));
    const protocolUrl = `downloadshuttle://add/${content}`;

    console.log('[Download Shuttle Link] Sending:', validLinks);
    console.log('[Download Shuttle Link] Protocol URL:', protocolUrl);

    // Store download info for popup to access in session storage
    // This will automatically be cleared when browser session ends
    const timestamp = Date.now();
    await chrome.storage.session.set({
      pendingDownload: {
        urls: validLinks,
        protocolUrl: protocolUrl,
        timestamp: timestamp
      }
    });

    console.log('[Download Shuttle Link] Stored in session storage (auto-clears on browser close)');

    // Show popup window instead of new tab
    const popupUrl = chrome.runtime.getURL('popup.html');
    await chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: 420,
      height: 460,
      focused: true
    });

    // Auto-cleanup after 5 minutes as safety measure
    // Session storage will also clear on browser close
    setTimeout(async () => {
      const result = await chrome.storage.session.get(['pendingDownload']);
      if (result.pendingDownload && result.pendingDownload.timestamp === timestamp) {
        console.log('[Download Shuttle Link] Cleaning up expired pending download');
        await chrome.storage.session.remove(['pendingDownload']);
      }
    }, 300000); // 5 minutes

  } catch (error) {
    console.error('[Download Shuttle Link] Error:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Download Shuttle Link Error',
      message: 'Failed to open Download Shuttle popup'
    });
  }
}

chrome.downloads.onCreated.addListener(async (downloadItem) => {
  console.log('[Download Shuttle Link] Download detected:', downloadItem.url);
  console.log('[Download Shuttle Link] MIME type:', downloadItem.mime);

  // Check if this is a browser-initiated download (should not be intercepted)
  if (browserDownloadIds.has(downloadItem.id)) {
    console.log('[Download Shuttle Link] Browser download - allowing');
    browserDownloadIds.delete(downloadItem.id); // Clean up
    return;
  }

  // Check if user is holding Alt (Option) to bypass interception
  const storageData = await chrome.storage.local.get(['bypassInterception', 'lastClickTime']);
  const bypassInterception = storageData.bypassInterception || false;
  const lastClickTime = storageData.lastClickTime || 0;
  const timeSinceClick = Date.now() - lastClickTime;

  // Only bypass if the key was pressed recently (within 2 seconds)
  // This prevents stale bypass state from affecting future downloads
  if (bypassInterception && timeSinceClick < 2000) {
    console.log('[Download Shuttle Link] Alt (Option) held - bypassing interception');
    // Clear bypass state
    chrome.storage.local.set({ bypassInterception: false });
    return;
  }

  const shouldIntercept = shouldInterceptByExtension(downloadItem.url) ||
                          shouldInterceptByMime(downloadItem.mime);

  if (shouldIntercept) {
    console.log('[Download Shuttle Link] Intercepting download');

    chrome.downloads.cancel(downloadItem.id, () => {
      chrome.downloads.erase({ id: downloadItem.id });
    });

    sendToDownloadShuttle([downloadItem.url]);
  } else {
    console.log('[Download Shuttle Link] Allowing browser download');
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Download Shuttle Link] Extension installed/updated:', details.reason);
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle bypass state from content script
  if (message.action === 'setBypass') {
    chrome.storage.local.set({
      bypassInterception: message.bypass,
      lastClickTime: message.timestamp || Date.now()
    });
    console.log('[Download Shuttle Link] Bypass state set:', message.bypass);
    sendResponse({ success: true });
    return true;
  }

  // Handle browser download from popup
  if (message.action === 'browserDownload') {
    console.log('[Download Shuttle Link] Starting browser downloads:', message.urls);

    // Download each URL using browser's download API
    message.urls.forEach(url => {
      chrome.downloads.download({
        url: url,
        saveAs: true // Show save dialog for each file
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('[Download Shuttle Link] Browser download error:', chrome.runtime.lastError);
        } else {
          console.log('[Download Shuttle Link] Browser download started:', downloadId);
          // Mark this download ID as browser-initiated so it won't be intercepted
          browserDownloadIds.add(downloadId);

          // Clean up after 30 seconds in case something goes wrong
          setTimeout(() => {
            browserDownloadIds.delete(downloadId);
          }, 30000);
        }
      });
    });

    sendResponse({ success: true });
    return true; // Keep message channel open for async response
  }
});

console.log('[Download Shuttle Link] Background script loaded');
