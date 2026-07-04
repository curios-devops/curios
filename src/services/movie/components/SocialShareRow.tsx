// Social share row for a finished movie (blueprint: copy ONLY the row of social icons).
// X, LinkedIn, Facebook, WhatsApp, TikTok (download), plus copy-link.

import { useState } from 'react';
import { Linkedin, Facebook, MessageCircle, Music2, Link2, Check } from 'lucide-react';
import { shareOrDownloadVideo } from '../../../utils/videoShare.ts';

interface SocialShareRowProps {
  shareUrl: string;
  title: string;
  caption?: string;
  videoUrl?: string;
  onShared?: () => void; // fire-and-forget analytics (increment share count)
}

// X (Twitter) has no current lucide glyph that reads as "X"; use a small inline mark.
function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export default function SocialShareRow({ shareUrl, title, caption, videoUrl, onShared }: SocialShareRowProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(caption ? `${title} — ${caption}` : title);

  const open = (url: string) => {
    onShared?.();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onShared?.();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const handleTikTok = () => {
    onShared?.();
    // TikTok has no web share intent. On mobile the native share sheet lets the user push the
    // mp4 straight into TikTok; elsewhere it downloads the file to upload manually. The plain
    // `<a download>` trick fails for our cross-origin Supabase URLs — see shareOrDownloadVideo.
    if (!videoUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    void shareOrDownloadVideo(videoUrl, title, {
      preferShare: true,
      text: caption ? `${title} — ${caption}` : title,
    });
  };

  const btn =
    'h-10 w-10 inline-flex items-center justify-center rounded-full border transition-colors';
  // Subtle elevated fill so the icon chip reads a touch LIGHTER than the page
  // background (movie page is near-black #040A14); transparent made them look
  // like black squares in dark mode.
  const btnStyle = {
    borderColor: 'var(--ui-border-default)',
    color: 'var(--ui-text-primary)',
    backgroundColor: 'var(--ui-bg-elevated)',
  } as const;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Share on X"
        className={btn}
        style={btnStyle}
        onClick={() => open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`)}
      >
        <XIcon size={18} />
      </button>

      <button
        type="button"
        aria-label="Share on LinkedIn"
        className={btn}
        style={btnStyle}
        onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)}
      >
        <Linkedin size={18} />
      </button>

      <button
        type="button"
        aria-label="Share on Facebook"
        className={btn}
        style={btnStyle}
        onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
      >
        <Facebook size={18} />
      </button>

      <button
        type="button"
        aria-label="Share on WhatsApp"
        className={btn}
        style={btnStyle}
        onClick={() => open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`)}
      >
        <MessageCircle size={18} />
      </button>

      <button
        type="button"
        aria-label="Download for TikTok"
        className={btn}
        style={btnStyle}
        onClick={handleTikTok}
      >
        <Music2 size={18} />
      </button>

      <button
        type="button"
        aria-label="Copy link"
        className={btn}
        style={btnStyle}
        onClick={handleCopy}
      >
        {copied ? <Check size={18} /> : <Link2 size={18} />}
      </button>
    </div>
  );
}
