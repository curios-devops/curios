/**
 * Device Detection Utilities
 * Detects screen size and device type for responsive video rendering
 */

/**
 * Detects optimal video format based on screen size and device type
 * 
 * Rules:
 * - Mobile (< 768px): Vertical (9:16)
 * - Portrait orientation: Vertical (9:16)
 * - Desktop/Tablet landscape: Horizontal (16:9)
 * 
 * @returns 'vertical' for mobile/portrait, 'horizontal' for desktop/landscape
 */
export function detectVideoFormat(): 'vertical' | 'horizontal' {
  // Server-side rendering: default to vertical (mobile-first)
  if (typeof window === 'undefined') {
    return 'vertical';
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Check breakpoints
  const isMobile = width < 768; // Tailwind 'md' breakpoint
  const isTablet = width >= 768 && width < 1024; // Tailwind 'lg' breakpoint
  const isDesktop = width >= 1024;

  // Check orientation
  const isPortrait = width < height;
  const isLandscape = width >= height;

  // Decision logic:
  // 1. Mobile devices: Always vertical (9:16)
  // 2. Portrait orientation: Always vertical (9:16)
  // 3. Tablet landscape: Horizontal (16:9)
  // 4. Desktop: Horizontal (16:9)

  if (isMobile || isPortrait) {
    return 'vertical';
  }

  if ((isTablet || isDesktop) && isLandscape) {
    return 'horizontal';
  }

  // Fallback: vertical (mobile-first)
  return 'vertical';
}

/**
 * Gets device type based on screen width
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') {
    return 'mobile';
  }

  const width = window.innerWidth;

  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Gets video dimensions based on format
 * @param format 'vertical' | 'horizontal'
 * @returns { width, height } in pixels
 */
export function getVideoDimensions(format: 'vertical' | 'horizontal'): { width: number; height: number } {
  return format === 'vertical'
    ? { width: 1080, height: 1920 } // 9:16 for mobile/portrait
    : { width: 1920, height: 1080 }; // 16:9 for desktop/landscape
}

/**
 * Gets recommended video dimensions based on current screen
 * @returns { width, height, format } optimized for current device
 */
export function getRecommendedVideoDimensions(): { 
  width: number; 
  height: number; 
  format: 'vertical' | 'horizontal' 
} {
  const format = detectVideoFormat();
  const { width, height } = getVideoDimensions(format);
  
  return { width, height, format };
}

/**
 * Hook-like function to listen for window resize and update format
 * Call this in a React useEffect
 * 
 * @param callback Function to call when format changes
 * @returns Cleanup function to remove listener
 */
export function onFormatChange(callback: (format: 'vertical' | 'horizontal') => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let currentFormat = detectVideoFormat();

  const handleResize = () => {
    const newFormat = detectVideoFormat();
    if (newFormat !== currentFormat) {
      currentFormat = newFormat;
      callback(newFormat);
    }
  };

  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}
