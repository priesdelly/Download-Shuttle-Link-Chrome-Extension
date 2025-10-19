// File extensions to intercept
const FILE_EXTENSIONS = [
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
  '.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
  '.iso', '.img', '.bin', '.torrent',
  '.apk', '.ipa'
];

// MIME types to intercept
const MIME_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/octet-stream',
  'application/x-msdownload',
  'application/x-apple-diskimage',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'video/x-matroska',
  'video/x-msvideo',
  'video/quicktime',
  'video/x-ms-wmv',
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
  'audio/aac',
  'audio/ogg'
];

// Check if URL should be intercepted by file extension
function shouldInterceptByExtension(url) {
  const urlLower = url.toLowerCase();
  return FILE_EXTENSIONS.some(ext => urlLower.endsWith(ext));
}

// Check if MIME type should be intercepted
function shouldInterceptByMime(mimeType) {
  if (!mimeType) return false;
  return MIME_TYPES.includes(mimeType.toLowerCase());
}

// Validate URL
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Send URLs to Download Shuttle
async function sendToDownloadShuttle(links) {
  if (!links || links.length === 0) {
    console.warn('[Download Shuttle Link] No links to send');
    return;
  }

  // Filter valid URLs
  const validLinks = links.filter(isValidUrl);
  if (validLinks.length === 0) {
    console.warn('[Download Shuttle Link] No valid URLs');
    return;
  }

  try {
    // Create JSON array and encode
    const content = encodeURIComponent(JSON.stringify(validLinks));
    const protocolUrl = `downloadshuttle://add/${content}`;

    console.log('[Download Shuttle Link] Sending:', validLinks);
    console.log('[Download Shuttle Link] Protocol URL:', protocolUrl);

    // Use the redirect.html file with the protocol URL in the hash
    // DON'T encode again - just pass the protocol URL as-is in the hash
    const redirectUrl = chrome.runtime.getURL('redirect.html') + '#' + protocolUrl;

    // Open the redirect page - user will click the button to trigger protocol
    await chrome.tabs.create({
      url: redirectUrl,
      active: true
    });

    // Note: The redirect.html page will handle closing itself after user clicks

  } catch (error) {
    console.error('[Download Shuttle Link] Error:', error);

    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Download Shuttle Link Error',
      message: 'Failed to open Download Shuttle redirect page'
    });
  }
}

// Main download interception listener
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('[Download Shuttle Link] Download detected:', downloadItem.url);
  console.log('[Download Shuttle Link] MIME type:', downloadItem.mime);

  // Check if we should intercept this download
  const shouldIntercept = shouldInterceptByExtension(downloadItem.url) ||
                          shouldInterceptByMime(downloadItem.mime);

  if (shouldIntercept) {
    console.log('[Download Shuttle Link] Intercepting download');

    // Cancel the browser's download immediately
    chrome.downloads.cancel(downloadItem.id, () => {
      // Remove from download history
      chrome.downloads.erase({ id: downloadItem.id });
    });

    // Send to Download Shuttle
    sendToDownloadShuttle([downloadItem.url]);
  } else {
    console.log('[Download Shuttle Link] Allowing browser download');
  }
});

// Log when extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Download Shuttle Link] Extension installed/updated:', details.reason);
});

console.log('[Download Shuttle Link] Background script loaded');
