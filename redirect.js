// Minimal comments retained: variable purpose and main handlers
let protocolUrl = '';
let downloadUrls = [];

window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        // Keep full protocol URL as-is (no decoding of the whole hash)
        protocolUrl = hash;
        console.log('[Download Shuttle Link] Protocol URL:', protocolUrl);

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

        const sendLink = document.getElementById('sendLink');
        if (sendLink) {
            sendLink.href = protocolUrl;
            console.log('[Download Shuttle Link] Link href set to:', protocolUrl);
        }
    } else {
        document.getElementById('urlDisplay').textContent = 'Error: No download URL provided';
        document.getElementById('sendButton').disabled = true;
    }

    const sendLink = document.getElementById('sendLink');
    if (sendLink) {
        sendLink.addEventListener('click', handleLinkClick);
        console.log('[Download Shuttle Link] Link event listener attached');
    }
});

function handleLinkClick() {
    console.log('[Download Shuttle Link] Link clicked - Download Shuttle should open');

    const button = document.getElementById('sendButton');
    button.disabled = true;
    button.textContent = 'Opening Download Shuttle...';

    document.getElementById('spinner').style.display = 'block';

    setTimeout(() => {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('success').style.display = 'block';
        button.textContent = '✓ Sent!';
    }, 1000);

    setTimeout(() => {
        window.close();
    }, 3000);
}
