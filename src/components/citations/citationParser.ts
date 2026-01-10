import { CitationInfo } from '../../commonApp/types';

export interface ParsedCitation {
  type: 'single' | 'multiple';
  siteName: string;
  citations: CitationInfo[];
  originalText: string;
}

/**
 * Parses citation text and matches it with the citations array
 * Handles formats: "SiteName", "SiteName +X" (brackets already removed by caller)
 */
export function parseCitation(
  citationText: string, 
  allCitations: CitationInfo[]
): ParsedCitation | null {
  if (!citationText || !allCitations || allCitations.length === 0) {
    return null;
  }

  // Parse "SiteName" or "SiteName +X" format (without brackets)
  let siteName = citationText.trim();
  let additionalCount = 0;
  
  // Check for "+N" suffix like "wikipedia +2"
  const plusMatch = siteName.match(/\s+\+(\d+)$/);
  if (plusMatch) {
    additionalCount = parseInt(plusMatch[1], 10);
    siteName = siteName.replace(/\s+\+\d+$/, '').trim();
  }

  // Keep it simple: site key is the first whitespace-separated token.
  // This prevents accidental "two website names" buttons when the model outputs
  // something like "wikipedia nytimes".
  siteName = siteName.split(/\s+/)[0]?.trim() || '';
  
  if (!siteName) return null;
  
  // Find matching citations by site name (compare using root-domain extraction)
  const matchingCitations = allCitations.filter(citation => {
    const citeSite = citation.siteName.toLowerCase();
    const citeRoot = extractSiteNameFromUrl(citation.url).toLowerCase();
    const key = siteName.toLowerCase();
    return citeSite === key || citeRoot === key;
  });
  
  if (matchingCitations.length === 0) {
    // If no direct match, try to find by partial matching
    const partialMatches = allCitations.filter(citation =>
      citation.siteName.toLowerCase().includes(siteName.toLowerCase()) ||
      siteName.toLowerCase().includes(citation.siteName.toLowerCase()) ||
      extractSiteNameFromUrl(citation.url).toLowerCase().includes(siteName.toLowerCase())
    );
    
    if (partialMatches.length > 0) {
      const countToShow = additionalCount > 0 ? (additionalCount + 1) : partialMatches.length;
      let citationsToShow = partialMatches.slice(0, countToShow);
      if (citationsToShow.length < countToShow && citationsToShow.length > 0) {
        const first = citationsToShow[0];
        while (citationsToShow.length < countToShow) {
          citationsToShow.push(first);
        }
      }
      return {
        type: citationsToShow.length > 1 ? 'multiple' : 'single',
        siteName,
        citations: citationsToShow,
        originalText: citationText
      };
    }
    
    return null;
  }
  
  // Determine how many to show:
  // - If "+N" is provided, show N+1 items
  // - Otherwise, show all matches (to compute +N automatically)
  const countToShow = additionalCount > 0
    ? additionalCount + 1
    : Math.max(matchingCitations.length, 1);
  let citationsToShow = matchingCitations.slice(0, countToShow);
  // If '+N' requested but we don't have enough matches, duplicate the first citation
  if (citationsToShow.length < countToShow && citationsToShow.length > 0) {
    const first = citationsToShow[0];
    while (citationsToShow.length < countToShow) {
      citationsToShow.push(first);
    }
  }
  
  return {
    type: citationsToShow.length > 1 ? 'multiple' : 'single',
    siteName,
    citations: citationsToShow,
    originalText: citationText
  };
}

/**
 * Extract site name from URL for fallback matching
 */
function extractSiteNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    // Handle ccTLDs like .co.uk
    if (parts.length >= 3 && parts[parts.length - 1].length === 2) {
      return parts[parts.length - 3];
    }
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts[0] || 'Unknown Site';
  } catch {
    return 'Unknown Site';
  }
}

/**
 * Capitalize first letter of site name for display
 */
export function formatSiteName(siteName: string): string {
  return siteName.charAt(0).toUpperCase() + siteName.slice(1);
}
