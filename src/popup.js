/**
 * Download Shuttle Link - Popup
 *
 * Reads the pending download info that background.js stored in session
 * storage, then offers two ways to download:
 *   1. Hand off to the Download Shuttle macOS app via a custom URL protocol
 *      (must be triggered by a real user click — browsers forbid extensions
 *      from triggering custom protocols programmatically).
 *   2. Fall back to a normal browser download via background.js.
 */

const EXPIRY_TIME_MS = 5 * 60 * 1000; // 5 minutes

// Module-level state, populated after we read storage.
let protocolUrl = '';
let downloadUrls = [];

// Flag so the beforeunload cleanup below knows whether the user actually
// completed a download action or just closed the popup early.
let actionCompleted = false;


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getElement(id) {
  return document.getElementById(id);
}

function setNote(message) {
  getElement('noteText').textContent = message;
}

function cleanupPendingDownload() {
  chrome.storage.session.remove([ 'pendingDownload' ], function () {
    console.log('[Download Shuttle Link] Cleaned up pending download from session');
  });
}


// ---------------------------------------------------------------------------
// Startup: load the pending download from storage
// ---------------------------------------------------------------------------

function startup() {
  // Atomically consume the pending download: read it and immediately delete it.
  // This makes the popup idempotent — if Chrome restores this popup window on
  // restart, the second load finds nothing and closes itself instead of
  // re-rendering a stale URL.
  chrome.storage.session.get([ 'pendingDownload' ], function (result) {
    const data = result.pendingDownload;
    chrome.storage.session.remove([ 'pendingDownload' ]);

    // No pending download means this popup was restored by the browser on
    // restart, or another popup already consumed it. Close it instead of
    // showing an empty UI.
    if (!data) {
      actionCompleted = true;
      window.close();
      return;
    }

    const age = Date.now() - (data.timestamp || 0);
    if (age > EXPIRY_TIME_MS) {
      console.log('[Download Shuttle Link] Pending download expired - closing popup');
      getElement('urlDisplay').textContent = 'Download request expired';
      setNote('This download request is too old and has been cancelled.');
      cleanupPendingDownload();
      setTimeout(function () { window.close(); }, 2000);
      return;
    }

    protocolUrl = data.protocolUrl;
    downloadUrls = data.urls;
    renderDownloadInfo();
    enableButtons();

    // Auto-close after 5 minutes if the user takes no action.
    setTimeout(function () {
      if (!actionCompleted) {
        console.log('[Download Shuttle Link] Auto-closing popup after timeout');
        cleanupPendingDownload();
        window.close();
      }
    }, EXPIRY_TIME_MS);
  });
}

function renderDownloadInfo() {
  if (downloadUrls.length === 1) {
    getElement('urlDisplay').textContent = downloadUrls[0];
  } else {
    getElement('urlDisplay').textContent =
      downloadUrls.length + ' files:\n' + downloadUrls.join('\n');
  }

  const sendLink = getElement('sendLink');
  if (sendLink) {
    sendLink.href = protocolUrl;
  }
}

function enableButtons() {
  // Buttons start as disabled in popup.html. We only enable them once the
  // pending download is loaded, otherwise an early click would send an empty
  // URL list or navigate to the placeholder href="#".
  getElement('sendButton').disabled = false;
  getElement('browserDownloadButton').disabled = false;
}


// ---------------------------------------------------------------------------
// Button: "Download Shuttle App"
//
// This is a real <a href="downloadshuttle://..."> click. We let the browser
// follow the link naturally — that's the only way the protocol handler will
// fire from an extension popup.
// ---------------------------------------------------------------------------

function handleDownloadShuttleClick(event) {
  console.log('[Download Shuttle Link] Sending to Download Shuttle');
  actionCompleted = true;

  const sendButton = getElement('sendButton');
  const browserButton = getElement('browserDownloadButton');

  sendButton.disabled = true;
  sendButton.textContent = '⏳ Opening Download Shuttle...';
  setNote('Opening Download Shuttle...');

  // Clear pending download immediately so the background script (and any
  // other window) won't try to process it again.
  cleanupPendingDownload();

  // Once the OS has had a moment to handle the protocol, restore the buttons
  // so the user can fall back to a browser download if the app didn't open.
  setTimeout(function () {
    sendButton.textContent = '✓ Sent to Download Shuttle';
    sendButton.disabled = false;
    browserButton.disabled = false;
    setNote('App not opening? Use Browser Download instead.');
    console.log('[Download Shuttle Link] Protocol handler called');
  }, 1500);

  // Keep the popup open for a few seconds so the user has time to click the
  // Browser Download fallback if the Shuttle app didn't actually open. We
  // can't detect that from JS — custom protocols give no feedback.
  setTimeout(function () { window.close(); }, 5000);
}


// ---------------------------------------------------------------------------
// Button: "Browser Download"
//
// Asks the background script to start a normal browser download. The
// background script will recognize the download as ours via the URL guard
// and not re-intercept it.
// ---------------------------------------------------------------------------

function handleBrowserDownloadClick() {
  console.log('[Download Shuttle Link] Using browser download');
  actionCompleted = true;

  const browserButton = getElement('browserDownloadButton');
  const sendButton = getElement('sendButton');

  browserButton.disabled = true;
  sendButton.disabled = true;
  browserButton.textContent = '⏳ Starting Download...';
  setNote('Starting browser download...');

  const message = {
    action: 'browserDownload',
    urls: downloadUrls
  };

  chrome.runtime.sendMessage(message, function () {
    cleanupPendingDownload();
    setTimeout(function () { window.close(); }, 1500);
  });
}


// ---------------------------------------------------------------------------
// Cleanup when the popup closes without any user action
// ---------------------------------------------------------------------------

window.addEventListener('beforeunload', function () {
  if (!actionCompleted) {
    console.log('[Download Shuttle Link] Popup closed without action - cleaning up');
    cleanupPendingDownload();
  }
});


// ---------------------------------------------------------------------------
// Wire up
// ---------------------------------------------------------------------------

getElement('sendLink').addEventListener('click', handleDownloadShuttleClick);
getElement('browserDownloadButton').addEventListener('click', handleBrowserDownloadClick);

startup();
