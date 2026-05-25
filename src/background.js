/**
 * Download Shuttle Link - Background Service Worker
 *
 * Monitors browser downloads, intercepts supported file types, and redirects
 * them to the Download Shuttle app via a custom protocol.
 */

// Storage key for the re-entry guard. We store URLs that the popup told us
// to download natively, so the onCreated listener below knows to let them
// through instead of intercepting them again.
//
// Why session storage (not an in-memory Set)?
//   1. MV3 service workers can be killed when idle, which would lose an
//      in-memory Set and cause the next "browser download" to be intercepted.
//   2. We must write the guard BEFORE calling chrome.downloads.download, so
//      onCreated never fires before the guard is in place.
const BROWSER_URL_KEY = 'browserDownloadUrls';

// Download Shuttle is macOS-only. On other platforms, stay completely passive:
// don't intercept downloads, don't show the popup. Cached after first lookup
// because chrome.runtime.getPlatformInfo is async and onCreated needs a sync
// decision path.
let isMacOS = null;
async function checkIsMacOS() {
  if (isMacOS === null) {
    const info = await chrome.runtime.getPlatformInfo();
    isMacOS = info.os === 'mac';
  }
  return isMacOS;
}

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
  'application/x-msdownload', 'application/x-apple-diskimage',
  'application/pdf', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4', 'video/x-matroska', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv',
  'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg'
];


// ---------------------------------------------------------------------------
// Re-entry guard helpers
// ---------------------------------------------------------------------------

async function addBrowserDownloadUrls(urls) {
  const stored = await chrome.storage.session.get(BROWSER_URL_KEY);
  const existing = stored[BROWSER_URL_KEY] || [];
  const updated = existing.concat(urls);
  await chrome.storage.session.set({ [BROWSER_URL_KEY]: updated });
}

async function takeBrowserDownloadUrl(url) {
  const stored = await chrome.storage.session.get(BROWSER_URL_KEY);
  const existing = stored[BROWSER_URL_KEY] || [];
  const index = existing.indexOf(url);

  if (index === -1) {
    return false;
  }

  existing.splice(index, 1);
  await chrome.storage.session.set({ [BROWSER_URL_KEY]: existing });
  return true;
}


// ---------------------------------------------------------------------------
// Interception decision
// ---------------------------------------------------------------------------

// Match against URL pathname only. Using endsWith on the full URL would fail
// for query strings, e.g. signed CDN links like "file.zip?token=abc".
function shouldInterceptByExtension(url) {
  let pathname;
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch (error) {
    return false;
  }

  for (const extension of FILE_EXTENSIONS) {
    if (pathname.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

function shouldInterceptByMime(mimeType) {
  if (!mimeType) {
    return false;
  }
  return MIME_TYPES.includes(mimeType.toLowerCase());
}

// Service workers can't observe page keyboard events, so we ask the content
// script of the active tab for the current Alt key state.
async function isAltKeyPressed() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab || !activeTab.id) {
      return false;
    }

    const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'checkAltKey' });
    if (response && response.altKeyPressed) {
      return true;
    }
    return false;
  } catch (error) {
    // Tab may not have our content script (e.g. chrome:// pages). Treat as "not pressed".
    console.log('[Download Shuttle Link] Could not check Alt key:', error.message);
    return false;
  }
}


// ---------------------------------------------------------------------------
// Popup window
// ---------------------------------------------------------------------------

async function showDownloadPopup(downloadUrl) {
  try {
    const urls = [ downloadUrl ];
    const encodedPayload = encodeURIComponent(JSON.stringify(urls));
    const protocolUrl = 'downloadshuttle://add/' + encodedPayload;

    console.log('[Download Shuttle Link] Protocol URL:', protocolUrl);

    await chrome.storage.session.set({
      pendingDownload: {
        urls: urls,
        protocolUrl: protocolUrl,
        timestamp: Date.now()
      }
    });

    const popupUrl = chrome.runtime.getURL('popup.html');
    await chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: 420,
      height: 460,
      focused: true
    });
  } catch (error) {
    console.error('[Download Shuttle Link] Error showing popup:', error);
  }
}


// ---------------------------------------------------------------------------
// Main: handle each new download
// ---------------------------------------------------------------------------

chrome.downloads.onCreated.addListener(async function (downloadItem) {
  if (!(await checkIsMacOS())) {
    return;
  }

  console.log('[Download Shuttle Link] Download detected:', downloadItem.url);
  console.log('[Download Shuttle Link] MIME type:', downloadItem.mime);

  // Step 1: was this download started by our own popup's "Browser Download"
  // fallback? If yes, let it through to avoid an infinite loop:
  //   popup -> chrome.downloads.download() -> onCreated -> intercept -> popup -> ...
  const isOurBrowserDownload = await takeBrowserDownloadUrl(downloadItem.url);
  if (isOurBrowserDownload) {
    console.log('[Download Shuttle Link] Own browser download - allowing');
    return;
  }

  // Step 2: user can hold Alt (Option) to bypass interception.
  const altPressed = await isAltKeyPressed();
  if (altPressed) {
    console.log('[Download Shuttle Link] Alt key held - bypassing interception');
    return;
  }

  // Step 3: decide based on extension or MIME type.
  const matchByExtension = shouldInterceptByExtension(downloadItem.url);
  const matchByMime = shouldInterceptByMime(downloadItem.mime);
  if (!matchByExtension && !matchByMime) {
    console.log('[Download Shuttle Link] Not a supported type - allowing');
    return;
  }

  // Step 4: cancel the native download and show our popup.
  console.log('[Download Shuttle Link] Intercepting download');
  chrome.downloads.cancel(downloadItem.id, function () {
    chrome.downloads.erase({ id: downloadItem.id });
  });
  await showDownloadPopup(downloadItem.url);
});


// ---------------------------------------------------------------------------
// Messages from the popup
// ---------------------------------------------------------------------------

async function handleBrowserDownloadRequest(urls) {
  // Mark URLs BEFORE starting downloads, so the onCreated listener above
  // will recognize them as ours even if it fires before download() returns.
  await addBrowserDownloadUrls(urls);

  for (const url of urls) {
    chrome.downloads.download({
      url: url,
      saveAs: true
    });
  }
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // Reject messages from other extensions.
  if (sender.id !== chrome.runtime.id) {
    return false;
  }

  if (message.action === 'browserDownload') {
    console.log('[Download Shuttle Link] Starting native browser downloads:', message.urls);

    handleBrowserDownloadRequest(message.urls).then(function () {
      sendResponse({ success: true });
    });

    // Return true to keep the message channel open for the async sendResponse above.
    return true;
  }

  return false;
});

console.log('[Download Shuttle Link] Background script loaded');
