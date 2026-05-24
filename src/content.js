/**
 * Download Shuttle Link - Content Script
 *
 * Runs on every page. Tracks whether the user is holding the Alt (Option) key
 * and replies to the background service worker when it asks for that state.
 * The background script needs to know this because it can't observe keyboard
 * events from pages directly.
 */

let altKeyPressed = false;


// Check whether the extension's runtime is still available. After the user
// reloads or updates the extension, old content scripts stay alive on already
// open pages but lose their connection to the extension. Touching chrome APIs
// in that state throws "Extension context invalidated".
function isExtensionContextValid() {
  if (typeof chrome === 'undefined') {
    return false;
  }
  if (!chrome.runtime) {
    return false;
  }
  if (!chrome.runtime.id) {
    return false;
  }
  return true;
}


// Track Alt key state. We use the capture phase (the third argument: true)
// so other page scripts can't stop these events from reaching us.
document.addEventListener('keydown', function (event) {
  if (event.key === 'Alt' || event.altKey) {
    altKeyPressed = true;
  }
}, true);

document.addEventListener('keyup', function (event) {
  if (event.key === 'Alt') {
    altKeyPressed = false;
  }
}, true);


// Listen for the background script's "checkAltKey" request.
//
// Sender: background.js inside chrome.downloads.onCreated, via
//   chrome.tabs.sendMessage(tabId, { action: 'checkAltKey' })
// It awaits our { altKeyPressed } reply to decide whether to bypass interception.
if (isExtensionContextValid()) {
  try {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.action === 'checkAltKey') {
        sendResponse({ altKeyPressed: altKeyPressed });
        console.log('[Download Shuttle Link] Alt key state checked:', altKeyPressed);
      }
    });
  } catch (error) {
    console.warn('[Download Shuttle Link] Could not setup message listener:', error.message);
  }
} else {
  console.warn('[Download Shuttle Link] Chrome API not available');
}
