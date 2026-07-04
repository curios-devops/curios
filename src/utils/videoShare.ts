// Cross-origin-safe video download + native file share.
//
// Why this exists: our videos live on Supabase Storage (a DIFFERENT origin than the app),
// and the HTML `download` attribute is IGNORED for cross-origin URLs — the browser just
// navigates to the file instead of saving it. On desktop that opens the mp4 in a new tab
// (looks like it "works"); on mobile no file is ever written. The fix is to fetch the video
// into a same-origin blob first, then either share it via the native share sheet (so apps
// like TikTok, which have no web upload intent, appear as a target) or download the blob URL.

function safeFileName(title: string): string {
  const base = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${base || 'curios-video'}.mp4`;
}

/** Fetch a (possibly cross-origin) video URL into a File. Throws on network/CORS failure. */
async function fetchVideoFile(videoUrl: string, fileName: string): Promise<File> {
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || 'video/mp4' });
}

/** Trigger a browser download from a same-origin blob (works for cross-origin sources). */
function downloadBlob(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Share/download a video the reliable way. On mobile with file-share support it opens the
 * native share sheet (the only way to get an mp4 into TikTok on a phone); everywhere else it
 * downloads the file. Falls back to opening the raw URL only if the fetch itself fails.
 *
 * @param preferShare When true, try the native share sheet before downloading (use for the
 *                     TikTok/"share" action). When false, always download (the Download button).
 */
export async function shareOrDownloadVideo(
  videoUrl: string,
  title: string,
  opts: { preferShare?: boolean; text?: string } = {},
): Promise<void> {
  const fileName = safeFileName(title);

  try {
    const file = await fetchVideoFile(videoUrl, fileName);

    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (opts.preferShare && typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title, text: opts.text });
        return;
      } catch (err) {
        // User cancelled the share sheet → don't fall through to a download.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Any other share failure → fall back to a plain download below.
      }
    }

    downloadBlob(file);
  } catch {
    // Network/CORS failure fetching the blob — last resort, open the raw URL.
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
  }
}
