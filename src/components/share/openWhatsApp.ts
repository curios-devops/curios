// WhatsApp share. The message is just the link: WhatsApp then shows its preview card
// (image, title, snippet, site) on top, read from the link's Open Graph tags — so the link
// must be one that serves them (curiosai.com/share or /s/:slug), not an SPA page.
//
// Phones go to wa.me in this same tab: it's a universal link, so the app opens straight
// away — no "Open in WhatsApp?" prompt (whatsapp:// asked) and no api.whatsapp.com tab left
// behind (iOS asked to "resubmit" it on return). Without the app, wa.me's page loads here.
export function openWhatsApp(url: string): void {
  const text = encodeURIComponent(url);
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = `https://wa.me/?text=${text}`;
    return;
  }
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
}
