import React from 'react';
import PhotosSection from '../PhotosSection';
import AdBanner from '../AdBanner';
import type { ImageResult } from '../../types';

interface SidebarProps {
  images?: ImageResult[];
}

export default function Sidebar({ images }: SidebarProps) {
  return (
    <div className="w-80 shrink-0">
      <div className="sticky top-24">
        {images && <PhotosSection images={images} />}
        <AdBanner
          dataAdSlot={import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT}
          style={{ minHeight: '600px' }}
          className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden"
        />
      </div>
    </div>
  );
}