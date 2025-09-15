import { CitationInfo } from '../../commonApp/types';

export interface ParsedCitation {
  type: 'single' | 'multiple';
  siteName: string;
  citations: CitationInfo[];
  originalText: string;
}

/**
 * Parses citation text and matches it with the citations array
 * Handles both [SiteName] and [SiteName +X] formats
 */
export function parseCitation(
  citationText: string, 
  allCitations: CitationInfo[]
): ParsedCitation | null {
  // Match [SiteName] or [SiteName +X] format
  const citationMatch = citationText.match(/\[([^[\]]+?)(?:\s*\+(\d+))?\]/);
  
  if (!citationMatch) return null;
  
  const siteName = citationMatch[1].trim();
  const additionalCount = citationMatch[2] ? parseInt(citationMatch[2], 10) : 0;
  
  // Find matching citations by site name
  const matchingCitations = allCitations.filter(citation => 
    citation.siteName.toLowerCase() === siteName.toLowerCase() ||
    extractSiteNameFromUrl(citation.url).toLowerCase() === siteName.toLowerCase()
  );
  
  if (matchingCitations.length === 0) {
    // If no direct match, try to find by partial matching
    const partialMatches = allCitations.filter(citation =>
      citation.siteName.toLowerCase().includes(siteName.toLowerCase()) ||
      siteName.toLowerCase().includes(citation.siteName.toLowerCase()) ||
      extractSiteNameFromUrl(citation.url).toLowerCase().includes(siteName.toLowerCase())
    );
    
    if (partialMatches.length > 0) {
      return {
        type: additionalCount > 0 ? 'multiple' : 'single',
        siteName,
        citations: partialMatches.slice(0, additionalCount + 1),
        originalText: citationText
      };
    }
    
    return null;
  }
  
  // Determine the number of citations to show
  const expectedTotal = additionalCount + 1;
  const citationsToShow = matchingCitations.slice(0, Math.max(expectedTotal, 1));
  
  return {
    type: additionalCount > 0 || citationsToShow.length > 1 ? 'multiple' : 'single',
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
    const domain = new URL(url).hostname;
    return domain.replace('www.', '').split('.')[0];
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
