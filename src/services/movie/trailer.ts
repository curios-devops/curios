// Movie 🍿: find the film's official trailer to show instead of a generated video.
// Reuses the shared video search (SerpAPI → Brave; no new API key). Falls back to a
// cover image (the best result's thumbnail) when there is no embeddable YouTube trailer.
import { searchVideos } from '../search/providers/mediaSearchProvider';

export interface MovieTrailer {
  /** youtube-nocookie embed URL, or null when no YouTube trailer was found. */
  embedUrl: string | null;
  /** Cover image: the trailer's YouTube thumbnail, else the first video result's thumbnail. */
  coverUrl: string | null;
}

/** YouTube video id from a watch / youtu.be / shorts / embed URL, else null. */
export function youTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

export async function findMovieTrailer(query: string): Promise<MovieTrailer> {
  const videos = await searchVideos(`${query} official trailer`);
  const trailer = videos.find((v) => youTubeId(v.url));
  const id = trailer ? youTubeId(trailer.url) : null;
  if (id) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0`,
      coverUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  return { embedUrl: null, coverUrl: videos.find((v) => v.thumbnail)?.thumbnail || null };
}
