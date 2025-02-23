import React, { useState, useEffect } from 'react';
import PhotosSection from '../PhotosSection';
import AdBanner from '../AdBanner';
import type { ImageResult, VideoResult } from '../../types';

interface SidebarProps {
  images?: ImageResult[];
  videos?: VideoResult[];
}

export default function Sidebar({ images, videos }: SidebarProps) {
  // Add state to persist media
  const [persistedImages, setPersistedImages] = useState<ImageResult[]>([]);
  const [persistedVideos, setPersistedVideos] = useState<VideoResult[]>([]);

  // Update persisted media when new data arrives
  useEffect(() => {
    if (images && images.length > 0) {
      setPersistedImages(images);
    }
    if (videos && videos.length > 0) {
      setPersistedVideos(videos);
    }
  }, [images, videos]);

  return (
    <div className="w-80 shrink-0">
      <div className="sticky top-24 space-y-4">
        {/* Photos Section */}
        {persistedImages.length > 0 && (
          <PhotosSection 
            images={persistedImages}
            maxImages={5} // Limit max images to prevent layout shifts
          />
        )}

        {/* Videos Section */}
        {persistedVideos.length > 0 && (
          <div className="bg-[#111111] rounded-xl border border-gray-800 p-4">
            <h3 className="text-lg font-medium text-white mb-3">Videos</h3>
            <div className="space-y-3">
              {persistedVideos.slice(0, 3).map((video, index) => (
                <a
                  key={index}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:bg-[#1a1a1a] rounded-lg p-2 transition-colors"
                >
                  {video.thumbnail && (
                    <div className="relative aspect-video mb-2 rounded-lg overflow-hidden">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {video.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                          {video.duration}
                        </span>
                      )}
                    </div>
                  )}
                  <h4 className="text-sm text-gray-300 line-clamp-2">{video.title}</h4>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Ad Banner */}
        <AdBanner
          dataAdSlot={import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT}
          style={{ minHeight: '600px' }}
          className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden"
        />
      </div>
    </div>
  );
}