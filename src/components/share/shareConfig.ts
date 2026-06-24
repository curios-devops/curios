// Global Dynamic Share Layer — config.
// Reusable across services (Fast Search now; Histories / Avatar / Movie next).
// The row of networks is data-driven so a new service just plugs into this map.

export type ServiceType = 'fast_search' | 'stories' | 'histories' | 'avatar' | 'movie';

export type SocialNetwork =
  | 'x'
  | 'bluesky'
  | 'linkedin'
  | 'facebook'
  | 'whatsapp'
  | 'reddit'
  | 'email'
  | 'copy';

// Common shape every service serializes its output into, decoupling
// content generation from distribution.
export interface SharePayload {
  title?: string;
  description?: string;
  text?: string;
  imageUrls?: string[];
  deepLink?: string;
}

// Network order per service. Image is style-only; order follows the blueprint.
export const shareConfig: Record<ServiceType, SocialNetwork[]> = {
  fast_search: ['x', 'bluesky', 'linkedin', 'facebook', 'whatsapp', 'reddit', 'email', 'copy'],
  stories: ['x', 'bluesky', 'linkedin', 'facebook', 'whatsapp', 'reddit', 'email', 'copy'],
  histories: ['x', 'bluesky', 'linkedin', 'facebook', 'whatsapp', 'reddit', 'email', 'copy'],
  avatar: ['x', 'bluesky', 'linkedin', 'facebook', 'whatsapp', 'reddit', 'email', 'copy'],
  movie: ['x', 'bluesky', 'linkedin', 'facebook', 'whatsapp', 'reddit', 'email', 'copy'],
};
