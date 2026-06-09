/**
 * Download Shuttle Link - Background Service Worker
 *
 * Monitors browser downloads, intercepts supported file types, and redirects
 * them to the Download Shuttle app via a custom protocol.
 */

// Storage key for the re-entry guard. We store URLs that the popup told us
// to download natively, so the download listener below knows to let them
// through instead of intercepting them again.
//
// Why session storage (not an in-memory Set)?
//   1. MV3 service workers can be killed when idle, which would lose an
//      in-memory Set and cause the next "browser download" to be intercepted.
//   2. We must write the guard BEFORE calling chrome.downloads.download, so
//      the listener never fires before the guard is in place.
const BROWSER_URL_KEY = 'browserDownloadUrls';

// Download Shuttle is macOS-only. On other platforms, stay completely passive:
// don't intercept downloads, don't show the popup. Cached after first lookup
// because chrome.runtime.getPlatformInfo is async and the download listener
// needs a sync decision path.
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
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
  '.iso', '.img', '.bin', '.torrent'
];

const MIME_TYPES = [
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
  'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
  'application/x-msdownload', 'application/x-apple-diskimage',
  'application/vnd.ms-excel',
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
// Called for both `url` and `finalUrl`: sites like LM Studio start the download
// from an extension-less endpoint (/download/latest/...) that 302-redirects to
// the real ".dmg", so only `finalUrl` carries the extension.
function shouldInterceptByExtension(url) {
  let pathname;
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch (error) {
    return false;
  }

  return FILE_EXTENSIONS.some((extension) => pathname.endsWith(extension));
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

// Download Shuttle names the saved file from the URL's last path component (its
// "name" dict key is ignored for naming). Redirect flows split the good name
// across url / finalUrl: a GitHub release link carries it in `url` (the CDN
// `finalUrl` is a UUID), while a "/latest" endpoint carries it in `finalUrl`.
// Pick whichever already ends in a real filename so the app names it correctly.
function pickDownloadUrl(downloadItem) {
  for (const candidate of [ downloadItem.url, downloadItem.finalUrl ]) {
    if (candidate && shouldInterceptByExtension(candidate)) return candidate;
  }
  return downloadItem.finalUrl || downloadItem.url;
}

async function showDownloadPopup(downloadUrl) {
  try {
    const urls = [ downloadUrl ];
    const protocolUrl = 'downloadshuttle://add/' + encodeURIComponent(JSON.stringify(urls));

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

// No-op callback that consumes chrome.runtime.lastError to prevent
// "Unchecked runtime.lastError" warnings on benign races (e.g. download already
// completed before our cancel/pause/resume runs). Pattern borrowed from IDM
// Integration Module — proven across many Chromium versions.
function consumeLastError() {
  void chrome.runtime.lastError;
}

// Pattern (from IDM Integration Module):
//   1. onCreated: pause immediately + start async decision.
//   2. onDeterminingFilename: if still deciding, return true (defer the dialog)
//      and stash the suggest() callback for later. This prevents the native
//      "Save As" dialog on browsers configured to ask where to save.
//   3. Decision made → either cancel (intercept, suggest is moot) or
//      call stashed suggest() + resume (let through).
//
// Tracks downloads we're holding for an async decision.
// Map<downloadId, { suggest: function|null }>
const heldDownloads = new Map();

chrome.downloads.onCreated.addListener(function (downloadItem) {
  if (downloadItem.state !== 'in_progress') return;
  if (isMacOS === false) return;

  console.log('[Download Shuttle Link] onCreated:', downloadItem.url, '->', downloadItem.finalUrl, downloadItem.mime);

  const matchByExtension =
    shouldInterceptByExtension(downloadItem.url) ||
    shouldInterceptByExtension(downloadItem.finalUrl);
  const matchByMime = shouldInterceptByMime(downloadItem.mime);
  if (!matchByExtension && !matchByMime) return;

  heldDownloads.set(downloadItem.id, { suggest: null });
  chrome.downloads.pause(downloadItem.id, consumeLastError);
  decideDownload(downloadItem);
});

// Defers Chrome's "Save As" dialog while we make the async decision. By the
// time this fires, decideDownload either has the entry tracked (pending) or
// has already removed it (decided + acted). Sync execution of releaseHeld/
// cancel means there's no in-between state to handle here.
chrome.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
  const held = heldDownloads.get(downloadItem.id);
  if (!held) return;

  // Pending: defer dialog and stash suggest for decideDownload to call.
  held.suggest = suggest;
  return true;
});

function releaseHeld(downloadId, held) {
  if (held.suggest) held.suggest();
  heldDownloads.delete(downloadId);
  chrome.downloads.resume(downloadId, consumeLastError);
}

async function decideDownload(downloadItem) {
  const held = heldDownloads.get(downloadItem.id);
  if (!held) return;

  try {
    if (!(await checkIsMacOS())) {
      releaseHeld(downloadItem.id, held);
      return;
    }

    // Re-entry guard: own browser-download fallback must pass through to
    // avoid loop: popup -> chrome.downloads.download() -> intercept -> popup.
    if (await takeBrowserDownloadUrl(downloadItem.url)) {
      console.log('[Download Shuttle Link] Own browser download - allowing');
      releaseHeld(downloadItem.id, held);
      return;
    }

    if (await isAltKeyPressed()) {
      console.log('[Download Shuttle Link] Alt key held - bypassing interception');
      releaseHeld(downloadItem.id, held);
      return;
    }

    const downloadUrl = pickDownloadUrl(downloadItem);
    console.log('[Download Shuttle Link] Intercepting download:', downloadUrl);
    chrome.downloads.cancel(downloadItem.id, function () {
      void chrome.runtime.lastError;
      chrome.downloads.erase({ id: downloadItem.id }, consumeLastError);
    });
    // suggest() is intentionally NOT called — cancel kills the download, so
    // the deferred listener has nothing to release.
    heldDownloads.delete(downloadItem.id);
    await showDownloadPopup(downloadUrl);
  } catch (e) {
    console.error('[Download Shuttle Link] decideDownload error:', e);
    releaseHeld(downloadItem.id, held);
  }
}


// ---------------------------------------------------------------------------
// Messages from the popup
// ---------------------------------------------------------------------------

async function handleBrowserDownloadRequest(urls) {
  // Mark URLs BEFORE starting downloads, so the download listener above
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

// Warm the isMacOS cache so the sync gate in onDeterminingFilename works on
// the very first download (before any async check has a chance to run).
checkIsMacOS();

console.log('[Download Shuttle Link] Background script loaded');
