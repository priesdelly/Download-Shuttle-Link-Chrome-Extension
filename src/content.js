/**
 * Download Shuttle Link - Content Script
 * Tracks Alt (Option) key to bypass download interception
 */

let altKeyPressed = false;

// Helper function to safely check if chrome API is available
function isChromeAvailable() {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}

// Track Alt key state
document.addEventListener('keydown', (event) => {
  if (event.key === 'Alt' || event.altKey) {
    altKeyPressed = true;
    console.log('[Download Shuttle Link] Alt key pressed');
  }
}, true);

document.addEventListener('keyup', (event) => {
  if (event.key === 'Alt' || !event.altKey) {
    altKeyPressed = false;
    console.log('[Download Shuttle Link] Alt key released');
  }
}, true);

// Listen for requests from background to check Alt key state
if (isChromeAvailable()) {
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.action === 'checkAltKey') {
          sendResponse({ altKeyPressed: altKeyPressed });
          console.log('[Download Shuttle Link] Alt key state checked:', altKeyPressed);
        }
      } catch (error) {
        console.warn('[Download Shuttle Link] Error in message listener:', error.message);
      }
      return true;
    });
    console.log('[Download Shuttle Link] Message listener registered');
  } catch (error) {
    console.warn('[Download Shuttle Link] Could not setup message listener:', error.message);
  }
} else {
  console.warn('[Download Shuttle Link] Chrome API not available');
}

console.log('[Download Shuttle Link] Content script loaded');
