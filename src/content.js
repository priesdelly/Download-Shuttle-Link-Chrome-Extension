/**
 * Download Shuttle Link - Content Script
 * Tracks Alt (Option) key to bypass download interception
 */

let bypassKeyPressed = false;

document.addEventListener('keydown', (event) => {
  if (event.altKey && !event.metaKey && !event.shiftKey && !event.ctrlKey) {
    bypassKeyPressed = true;
    chrome.runtime.sendMessage({
      action: 'setBypass',
      bypass: true
    }).catch(() => {});
    console.log('[Download Shuttle Link] Alt detected - bypass enabled');
  }
}, true);

document.addEventListener('keyup', (event) => {
  if (!event.altKey) {
    bypassKeyPressed = false;
    chrome.runtime.sendMessage({
      action: 'setBypass',
      bypass: false
    }).catch(() => {});
    console.log('[Download Shuttle Link] Alt released - bypass disabled');
  }
}, true);

document.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (link && link.href) {
    const bypassState = event.altKey && !event.metaKey && !event.shiftKey && !event.ctrlKey;
    if (bypassState) {
      chrome.runtime.sendMessage({
        action: 'setBypass',
        bypass: true,
        timestamp: Date.now()
      }).catch(() => {});
      console.log('[Download Shuttle Link] Link clicked with Alt - will bypass');
    }
  }
}, true);

console.log('[Download Shuttle Link] Content script loaded');
