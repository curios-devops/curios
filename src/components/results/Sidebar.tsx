import AdBanner from '../AdBanner';
import type { ImageResult, VideoResult } from '../../types';

interface SidebarProps {
  images?: ImageResult[];
  videos?: VideoResult[];
}

export default function Sidebar({ images, videos }: SidebarProps) {
  return (
    <div className="w-80 shrink-0">
      <div className="sticky top-24 space-y-6">
        {images && images.length > 0 && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-200">
            <div className="p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 transition-colors duration-200">Images</h2>
              <div className="grid grid-cols-2 gap-2">
                {images.slice(0, 4).map((image, index) => (
                  <a
                    key={index}
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-gray-100 dark:bg-[#1a1a1a] rounded-lg overflow-hidden group transition-colors duration-200"
                  >
                    <img
                      src={image.image}
                      alt={image.title || ''}
                      className="w-full h-full object-cover transform transition-all duration-200 group-hover:scale-110"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {videos && videos.length > 0 && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-200">
            <div className="p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 transition-colors duration-200">Videos</h2>
              <div className="space-y-3">
                {videos.slice(0, 3).map((video, index) => (
                  <a
                    key={index}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    {video.thumbnail && (
                      <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h4 className="text-sm text-gray-900 dark:text-gray-300 line-clamp-2 group-hover:text-[#0095FF] transition-colors duration-200">{video.title}</h4>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ad Banner */}
        <AdBanner
          dataAdSlot={import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT}
          style={{ minHeight: '600px' }}
          className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-200"
        />
      </div>
    </div>
  );
}