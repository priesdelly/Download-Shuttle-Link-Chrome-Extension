let protocolUrl = '';
let downloadUrls = [];

// Get the URL from the hash when page loads
window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        // DON'T decode - the hash already contains the correct protocol URL
        protocolUrl = hash;
        console.log('[Download Shuttle Link] Protocol URL:', protocolUrl);

        // Extract and display the download URLs
        try {
            const match = protocolUrl.match(/downloadshuttle:\/\/add\/(.+)/);
            if (match) {
                const encoded = match[1];
                const jsonStr = decodeURIComponent(encoded);
                downloadUrls = JSON.parse(jsonStr);

                if (downloadUrls.length === 1) {
                    document.getElementById('urlDisplay').textContent = downloadUrls[0];
                } else {
                    document.getElementById('urlDisplay').textContent =
                        `${downloadUrls.length} files:\n${downloadUrls.join('\n')}`;
                }
            }
        } catch (e) {
            console.error('Error parsing URLs:', e);
            document.getElementById('urlDisplay').textContent = 'Download file(s)';
        }

        // Set the link href to the protocol URL
        const sendLink = document.getElementById('sendLink');
        if (sendLink) {
            sendLink.href = protocolUrl;
            console.log('[Download Shuttle Link] Link href set to:', protocolUrl);
        }
    } else {
        document.getElementById('urlDisplay').textContent = 'Error: No download URL provided';
        document.getElementById('sendButton').disabled = true;
    }

    // Attach click event listener to the link for auto-close
    const sendLink = document.getElementById('sendLink');
    if (sendLink) {
        sendLink.addEventListener('click', handleLinkClick);
        console.log('[Download Shuttle Link] Link event listener attached');
    }
});

function handleLinkClick() {
    console.log('[Download Shuttle Link] Link clicked - Download Shuttle should open');

    // Show feedback
    const button = document.getElementById('sendButton');
    button.disabled = true;
    button.textContent = 'Opening Download Shuttle...';

    // Show spinner
    document.getElementById('spinner').style.display = 'block';

    // Show success message after a short delay
    setTimeout(() => {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('success').style.display = 'block';
        button.textContent = '✓ Sent!';
    }, 1000);

    // Close window after user has time to see the feedback
    setTimeout(() => {
        window.close();
    }, 3000);
}
