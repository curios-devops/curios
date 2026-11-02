// A link preview can't play a video (LinkedIn never does), so its picture says it is one: Cloudinary draws
// the same round play mark the recorder puts on its posters. netlify/edge-functions/video-share-og.js has a
// copy, for saved videos.
const MARK = 'l_text:Arial_460:%E2%97%8F,co_black,o_45/fl_layer_apply,g_center/l_text:Arial_130:%E2%96%B6,co_white/fl_layer_apply,g_center,x_8';

/** Pictures from elsewhere stay as they are; a recorded poster already has its mark. */
export function withPlayMark(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  if (image.includes('-poster.') || !image.includes('res.cloudinary.com/')) return image;
  return image.replace('/image/upload/', `/image/upload/${MARK}/`);
}
