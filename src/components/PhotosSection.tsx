import React, { useState } from 'react';
import { Image, ChevronRight } from 'lucide-react';
import type { ImageResult } from '../types';

interface PhotosSectionProps {
  images: ImageResult[];
}

export default function PhotosSection({ images }: PhotosSectionProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Filter out invalid images and ensure unique URLs
  const validImages = Array.from(
    new Map(
      images
        .filter(img => {
          try {
            new URL(img.url);
            return true;
          } catch {
            return false;
          }
        })
        .map(img => [img.url, img])
    ).values()
  );

  // Only show section if we have at least 1 image
  if (validImages.length < 1) return null;

  // Prepare image sections
  const mainImage = validImages[0];
  const rowImages = validImages.slice(1, 3);
  const lastRowImage = validImages[3];
  const miniImages = validImages.slice(4, 7);
  const hasMoreImages = validImages.length > 7;

  return (
    <div className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden mb-4">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Image className="text-[#0095FF]" size={22} />
          <h2 className="text-xl font-medium text-white">Photos</h2>
        </div>

        <div className="space-y-3">
          {/* Main large photo */}
          {mainImage && (
            <a 
              href={mainImage.source_url || mainImage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full h-48 overflow-hidden rounded-lg"
            >
              <img
                src={mainImage.url}
                alt={mainImage.alt}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </a>
          )}

          {/* Two medium photos row */}
          {rowImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {rowImages.map((image, index) => (
                <a
                  key={index}
                  href={image.source_url || image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-32 overflow-hidden rounded-lg"
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Last row with one medium and mini photos */}
          {lastRowImage && (
            <div className="grid grid-cols-2 gap-3">
              {/* Medium photo on left */}
              <a
                href={lastRowImage.source_url || lastRowImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-32 overflow-hidden rounded-lg"
              >
                <img
                  src={lastRowImage.url}
                  alt={lastRowImage.alt}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </a>

              {/* Mini photos container */}
              {miniImages.length > 0 && (
                <div className="bg-[#222222] rounded-lg p-2">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {miniImages.map((image, index) => (
                      <a
                        key={index}
                        href={image.source_url || image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-[52px] overflow-hidden rounded-lg"
                      >
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                  {hasMoreImages && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-[#0095FF] hover:text-[#0080FF] transition-colors py-1"
                    >
                      View More
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}