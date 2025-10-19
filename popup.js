// Popup script for Download Shuttle Link
let protocolUrl = '';
let downloadUrls = [];

// Get download info from background script
chrome.storage.local.get(['pendingDownload'], (result) => {
    if (result.pendingDownload) {
        const data = result.pendingDownload;
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

function handleDownloadShuttleClick() {
    console.log('[Download Shuttle Link] Sending to Download Shuttle');

    const button = document.getElementById('sendButton');
    const browserButton = document.getElementById('browserDownloadButton');

    button.disabled = true;
    browserButton.disabled = true;
    button.textContent = '⏳ Opening Download Shuttle...';
    document.getElementById('noteText').textContent = 'Download Shuttle should open now';

    // Clear pending download
    chrome.storage.local.remove(['pendingDownload']);

    // Close popup after a delay
    setTimeout(() => {
        window.close();
    }, 2000);
}

// Handle Browser Download button click
document.getElementById('browserDownloadButton').addEventListener('click', () => {
    console.log('[Download Shuttle Link] Using browser download');

    const button = document.getElementById('browserDownloadButton');
    const shuttleButton = document.getElementById('sendButton');

    button.disabled = true;
    shuttleButton.disabled = true;
    button.textContent = '⏳ Starting Download...';
    document.getElementById('noteText').textContent = 'Browser download starting...';

    // Request background to start browser downloads
    chrome.runtime.sendMessage({
        action: 'browserDownload',
        urls: downloadUrls
    }, (response) => {
        // Clear pending download
        chrome.storage.local.remove(['pendingDownload']);

        // Close popup after a delay
        setTimeout(() => {
            window.close();
        }, 2000);
    });
});
