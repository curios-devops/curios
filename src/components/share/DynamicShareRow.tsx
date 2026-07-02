// Reusable Dynamic Share Row.
// Renders a "SHARE" label + a row of square rounded icon buttons, one per
// network from shareConfig[serviceType]. User shares one network per click.
// Global: any service passes a SharePayload; not anchored to Fast Search.

import { useState, type ReactNode } from 'react';
import { Linkedin, Facebook, Mail, Link2, Check } from 'lucide-react';
import { shareConfig, type ServiceType, type SocialNetwork, type SharePayload } from './shareConfig';
import { buildShareHref } from './buildSocialShareUrl';

// X (Twitter) has no lucide glyph that reads as "X"; small inline mark.
function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

// Bluesky butterfly mark (no lucide glyph).
function BlueskyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 600 530" fill="currentColor" aria-hidden="true">
      <path d="M135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.38-3.69-10.832-3.708-7.896-.017-2.936-1.193.516-3.707 7.896-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.45-163.25-81.433-5.956-21.281-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
  );
}

// WhatsApp official glyph (with the phone), no lucide equivalent.
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// Reddit official mark, no lucide equivalent.
function RedditIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.923.412-.923.919 0 .506.414.918.923.918.508.001.922-.412.922-.918zm13.202-.93C24 5.371 18.626 0 12 0S0 5.371 0 12c0 6.627 5.374 12 12 12s12-5.373 12-12zm-6.349-1.293c.926 0 1.678.752 1.678 1.678 0 .679-.404 1.262-.984 1.527-.026.162-.044.327-.044.497 0 2.391-2.731 4.328-6.101 4.328-3.369 0-6.1-1.937-6.1-4.328 0-.17-.018-.335-.044-.497-.58-.265-.984-.848-.984-1.527 0-.926.752-1.678 1.678-1.678.453 0 .863.181 1.165.473 1.149-.793 2.726-1.301 4.474-1.366l.835-3.919c.019-.09.073-.168.151-.217.077-.049.171-.064.261-.045l2.739.581c.191-.383.585-.649 1.043-.649.645 0 1.168.523 1.168 1.168 0 .644-.523 1.167-1.168 1.167-.622 0-1.13-.488-1.165-1.102l-2.466-.523-.749 3.513c1.722.078 3.273.583 4.408 1.366.302-.292.712-.473 1.165-.473zm-3.143 2.42c-.508 0-.922.412-.922.919 0 .506.414.918.922.918.509 0 .923-.412.923-.918 0-.507-.414-.919-.923-.919z" />
    </svg>
  );
}

const NETWORK_LABEL: Record<SocialNetwork, string> = {
  x: 'X',
  bluesky: 'Bluesky',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  reddit: 'Reddit',
  email: 'Email',
  copy: 'Copy link',
};

function NetworkIcon({ network, copied }: { network: SocialNetwork; copied: boolean }) {
  switch (network) {
    case 'x':
      return <XIcon size={18} />;
    case 'bluesky':
      return <BlueskyIcon size={18} />;
    case 'linkedin':
      return <Linkedin size={18} />;
    case 'facebook':
      return <Facebook size={18} />;
    case 'whatsapp':
      return <WhatsAppIcon size={18} />;
    case 'reddit':
      return <RedditIcon size={18} />;
    case 'email':
      return <Mail size={18} />;
    case 'copy':
      return copied ? <Check size={18} /> : <Link2 size={18} />;
  }
}

interface DynamicShareRowProps {
  serviceType: ServiceType;
  payload: SharePayload;
  // Optional extra action(s) rendered at the end of the row (e.g. Export PDF in
  // Fast Search's Ask Deeper mode). Kept generic so the row stays service-agnostic.
  trailing?: ReactNode;
  // Fired once per share interaction (any network), before the share opens.
  // Lets the page publish its snapshot (flip is_public) and count the share.
  onShare?: () => void;
}

export default function DynamicShareRow({ serviceType, payload, trailing, onShare }: DynamicShareRowProps) {
  const [copied, setCopied] = useState(false);
  const networks = shareConfig[serviceType] || [];

  if (networks.length === 0 || !payload.deepLink) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload.deepLink || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const handleClick = (network: SocialNetwork) => {
    onShare?.();
    if (network === 'copy') {
      handleCopy();
      return;
    }
    const href = buildShareHref(network, payload);
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex items-center gap-4 py-2 border-b border-gray-200 dark:border-gray-800">
      <span className="text-xs font-medium tracking-wider uppercase text-gray-400 dark:text-gray-500">
        Share
      </span>
      <div className="flex items-center gap-2">
        {networks.map((network) => (
          <button
            key={network}
            type="button"
            aria-label={NETWORK_LABEL[network]}
            title={NETWORK_LABEL[network]}
            onClick={() => handleClick(network)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#353535] text-gray-900 dark:text-white transition-colors"
          >
            <NetworkIcon network={network} copied={copied} />
          </button>
        ))}
        {trailing}
      </div>
    </div>
  );
}
