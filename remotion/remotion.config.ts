/**
 * Remotion Configuration
 * Settings for video rendering in Studio
 */

import { Config } from '@remotion/cli/config';

// Video quality settings
Config.setVideoImageFormat('jpeg');
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);

// Performance settings
Config.setConcurrency(2); // Limit concurrent rendering to avoid overload

// Output settings
Config.setCodec('h264'); // H.264 for maximum compatibility

// Browser settings
Config.setBrowserExecutable(null); // Use bundled Chromium

export {};
