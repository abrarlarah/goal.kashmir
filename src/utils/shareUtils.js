export const handleShare = async (title, text, url) => {
    // Ensure we have a fully qualified URL
    const shareUrl = url.startsWith('http') ? url : window.location.origin + window.location.pathname + '#' + url;

    if (navigator.share) {
        try {
           await navigator.share({
               title,
               text,
               url: shareUrl,
           });
           return true; 
        } catch (err) {
           // User cancelled share or other error, fallback to clipboard if not AbortError
           if (err.name !== 'AbortError') {
               return copyToClipboard(shareUrl);
           }
           return false;
        }
    } else {
        // Fallback: Copy to clipboard
        return copyToClipboard(shareUrl);
    }
};

const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        alert('Link copied to clipboard! You can now paste and share it.');
        return true;
    } catch (err) {
        alert('Failed to copy link. Please manually copy the URL from your browser.');
        return false;
    }
};
