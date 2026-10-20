// WhatsApp share. The message is just the link: WhatsApp then shows its preview card
// (image, title, snippet, site) on top, read from the link's Open Graph tags — so the link
// must be one that serves them (curiosai.com/share or /s/:slug), not an SPA page.
//
// Phones open the app directly (whatsapp://) and the page stays where it is. Opening
// api.whatsapp.com in a new Safari tab left a tab behind that iOS asked to "resubmit"
// when the user came back.
export function openWhatsApp(url: string): void {
  const text = encodeURIComponent(url);
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = `whatsapp://send?text=${text}`;
    return;
  }
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
}
