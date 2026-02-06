/**
 * Remotion Entry Point
 * Register root composition for rendering
 */

import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

// Register the root component
registerRoot(RemotionRoot);

// Export for external use
export { RemotionRoot } from './Root';
export { StudioVideo } from './StudioVideo';
export { StudioChunk } from './StudioChunk';
export type { StudioVideoProps } from './Root';
