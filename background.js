/**
 * Download Shuttle Link - Background Service Worker
 *
 * Monitors browser downloads, intercepts supported file types, and redirects
 * them to the Download Shuttle app via a custom protocol.
 */

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

    const redirectUrl = chrome.runtime.getURL('redirect.html') + '#' + protocolUrl;

    await chrome.tabs.create({ url: redirectUrl, active: true });

  } catch (error) {
    console.error('[Download Shuttle Link] Error:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Download Shuttle Link Error',
      message: 'Failed to open Download Shuttle redirect page'
    });
  }
}

chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('[Download Shuttle Link] Download detected:', downloadItem.url);
  console.log('[Download Shuttle Link] MIME type:', downloadItem.mime);

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

console.log('[Download Shuttle Link] Background script loaded');
