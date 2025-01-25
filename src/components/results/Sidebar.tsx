import React, { useState, useEffect } from 'react';
import PhotosSection from '../PhotosSection';
import AdBanner from '../AdBanner';
import type { ImageResult } from '../../types';

interface SidebarProps {
  images?: ImageResult[];
}

export default function Sidebar({ images }: SidebarProps) {
  // Add state to persist images
  const [persistedImages, setPersistedImages] = useState<ImageResult[]>([]);

  // Update persisted images when new images arrive
  useEffect(() => {
    if (images && images.length > 0) {
      setPersistedImages(images);
    }
  }, [images]);

  return (
    <div className="w-80 shrink-0">
      <div className="sticky top-24 space-y-4">
        {/* Use persisted images instead of direct images prop */}
        {persistedImages.length > 0 && (
          <PhotosSection 
            images={persistedImages}
            maxImages={7} // Limit max images to prevent layout shifts
          />
        )}
        <AdBanner
          dataAdSlot={import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT}
          style={{ minHeight: '600px' }}
          className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden"
        />
      </div>
    </div>
  );
}