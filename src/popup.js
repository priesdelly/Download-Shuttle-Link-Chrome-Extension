// Popup script for Download Shuttle Link
let protocolUrl = '';
let downloadUrls = [];

// Constants
const EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cleanup function to remove pending download from session storage
function cleanupPendingDownload() {
    chrome.storage.session.remove(['pendingDownload'], () => {
        console.log('[Download Shuttle Link] Cleaned up pending download from session');
    });
}

// Clean up when popup is closed (user presses X, ESC, or closes window)
// Session storage will also auto-clear on browser close
window.addEventListener('beforeunload', () => {
    // Only cleanup if user didn't complete any action
    if (!window.actionCompleted) {
        console.log('[Download Shuttle Link] Popup closed without action - cleaning up');
        cleanupPendingDownload();
    }
});

// Flag to track if user completed an action
window.actionCompleted = false;

// Get download info from background script (stored in session storage)
chrome.storage.session.get(['pendingDownload'], (result) => {
    if (result.pendingDownload) {
        const data = result.pendingDownload;
        const timestamp = data.timestamp || 0;
        const currentTime = Date.now();
        const age = currentTime - timestamp;

        // Check if pending download is expired (older than 5 minutes)
        if (age > EXPIRY_TIME) {
            console.log('[Download Shuttle Link] Pending download expired (age:', age, 'ms) - closing popup');
            document.getElementById('urlDisplay').textContent = 'Download request expired';
            document.getElementById('noteText').textContent = 'This download request is too old and has been cancelled.';

            // Clean up and close
            cleanupPendingDownload();
            setTimeout(() => {
                window.close();
            }, 2000);
            return;
        }

        protocolUrl = data.protocolUrl;
        downloadUrls = data.urls;

        if (downloadUrls.length === 1) {
            document.getElementById('urlDisplay').textContent = downloadUrls[0];
        } else {
            document.getElementById('urlDisplay').textContent =
                `${downloadUrls.length} files:\n${downloadUrls.join('\n')}`;
        }

        const sendLink = document.getElementById('sendLink');
        if (sendLink) {
            sendLink.href = protocolUrl;
        }

        // Auto-close after 5 minutes if no action taken
        setTimeout(() => {
            if (!window.actionCompleted) {
                console.log('[Download Shuttle Link] Auto-closing popup after timeout');
                cleanupPendingDownload();
                window.close();
            }
        }, EXPIRY_TIME);

    } else {
        document.getElementById('urlDisplay').textContent = 'Error: No download URL provided';
        document.getElementById('sendButton').disabled = true;
        document.getElementById('browserDownloadButton').disabled = true;
    }
});

// Handle Download Shuttle button click
const sendLink = document.getElementById('sendLink');
if (sendLink) {
    sendLink.addEventListener('click', handleDownloadShuttleClick);
}

function handleDownloadShuttleClick(event) {
    // Let the anchor tag work naturally to trigger protocol handler
    console.log('[Download Shuttle Link] Sending to Download Shuttle');

    // Mark action as completed
    window.actionCompleted = true;

    const button = document.getElementById('sendButton');
    const browserButton = document.getElementById('browserDownloadButton');

    button.disabled = true;
    button.textContent = '⏳ Opening Download Shuttle...';
    document.getElementById('noteText').textContent = 'Opening Download Shuttle...';

    // Clear pending download immediately to prevent background from processing it again
    cleanupPendingDownload();

    // Update UI after protocol attempt
    setTimeout(() => {
        button.textContent = '✓ Sent to Download Shuttle';
        button.disabled = false;
        browserButton.disabled = false;

        document.getElementById('noteText').textContent = 'App not opening? Use Browser Download instead.';

        console.log('[Download Shuttle Link] Protocol handler called');
    }, 1500);

    // Close popup after a delay
    setTimeout(() => {
        window.close();
    }, 5000);
}

function useBrowserDownload() {
    console.log('[Download Shuttle Link] Using browser download');

    // Mark action as completed
    window.actionCompleted = true;

    const button = document.getElementById('browserDownloadButton');

    button.textContent = '⏳ Starting Download...';
    button.disabled = true;
    document.getElementById('noteText').textContent = 'Starting browser download...';

    // Request background to start browser downloads
    chrome.runtime.sendMessage({
        action: 'browserDownload',
        urls: downloadUrls
    }, (response) => {
        // Clear pending download
        cleanupPendingDownload();

        // Close popup after a delay
        setTimeout(() => {
            window.close();
        }, 1500);
    });
}

// Handle Browser Download button click
document.getElementById('browserDownloadButton').addEventListener('click', () => {
    const button = document.getElementById('browserDownloadButton');
    const shuttleButton = document.getElementById('sendButton');

    button.disabled = true;
    shuttleButton.disabled = true;
    document.getElementById('noteText').textContent = 'Browser download starting...';

    useBrowserDownload();
});
