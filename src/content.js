/**
 * Download Shuttle Link - Content Script
 * Tracks Alt (Option) key to bypass download interception
 */

let altKeyPressed = false;

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
try {
  if (chrome.runtime?.id) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'checkAltKey') {
        sendResponse({ altKeyPressed: altKeyPressed });
        console.log('[Download Shuttle Link] Alt key state checked:', altKeyPressed);
      }
      return true;
    });
  }
} catch (error) {
  console.warn('[Download Shuttle Link] Could not setup message listener:', error.message);
}

console.log('[Download Shuttle Link] Content script loaded');
