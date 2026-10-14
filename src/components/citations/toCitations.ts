import type { CitationInfo } from '../../commonApp/types';

// Sources → the citations CustomMarkdown turns [site] chips into (Search and Magazine).
// siteName prefers the first hostname part: azure.microsoft.com → azure, wikipedia.org → wikipedia.
export function toCitations(sources: Array<{ url: string; title: string; snippet?: string }>): CitationInfo[] {
  return sources.map((source) => {
    let hostname = '';
    try {
      hostname = new URL(source.url).hostname.replace(/^www\./, '');
    } catch {
      /* not a URL — no site name */
    }
    return { url: source.url, title: source.title, siteName: hostname.split('.')[0] || '', snippet: source.snippet };
  });
}
