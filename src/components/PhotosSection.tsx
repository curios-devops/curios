import { useState } from 'react';
import { Image, ChevronRight } from 'lucide-react';
import type { ImageResult } from '../types';

interface PhotosSectionProps {
  images: ImageResult[];
  maxImages?: number;
}

export default function PhotosSection({ images, maxImages = 7 }: PhotosSectionProps) {
  const [, setShowAll] = useState(false);

  // Filter out invalid images and ensure unique URLs
  const validImages = Array.from(
    new Map(
      images
        ?.filter((img) => {
          try {
            const url = new URL(img.url);
            return url.protocol === 'https:';
          } catch {
            return false;
          }
        })
        .map((img) => [img.url, img])
    ).values()
  ).slice(0, maxImages);

  // Only show section if we have at least 1 image
  if (validImages.length < 1) return null;

  // Prepare image slices
  const mainImage = validImages[0];         // First row: 1 large image
  const rowImages = validImages.slice(1, 3); // Second row: 2 images
  const lastRowLeftImage = validImages[3];   // Third row left: 1 large image
  const miniImages = validImages.slice(4);   // Third row right: up to 3 mini images
  const hasMoreImages = validImages.length > 7;

  return (
    <div className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden mb-4">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4 justify-between">
          <div className="flex items-center gap-2">
            <Image className="text-[#0095FF]" size={22} />
            <h2 className="text-xl font-medium text-white">Images</h2>
          </div>
          <span className="text-sm text-gray-400">
            {validImages.length} results
          </span>
        </div>

        <div className="space-y-3">
          {/* First Row - Main Image */}
          {mainImage && (
            <a
              href={mainImage.source_url || mainImage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full overflow-hidden rounded-lg"
            >
              <img
                src={mainImage.url}
                alt={mainImage.alt}
                className="w-full aspect-[16/9] object-cover hover:scale-105 transition-transform duration-300 bg-gray-800"
                loading="lazy"
                onError={(e) => {
                  // Hide broken images gracefully
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </a>
          )}

          {/* Second Row - Two Images */}
          {rowImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {rowImages.map((image, index) => (
                <a
                  key={index}
                  href={image.source_url || image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden rounded-lg"
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full aspect-[16/9] object-cover hover:scale-105 transition-transform duration-300 bg-gray-800"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </a>
              ))}
            </div>
          )}

          {/* Third Row - Left Large Image + Right Mini Grid */}
          {lastRowLeftImage && (
            <div className="grid grid-cols-2 gap-3">
              {/* Left Large Image */}
              <a
                href={lastRowLeftImage.source_url || lastRowLeftImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="overflow-hidden rounded-lg"
              >
                <img
                  src={lastRowLeftImage.url}
                  alt={lastRowLeftImage.alt}
                  className="w-full aspect-[16/9] object-cover hover:scale-105 transition-transform duration-300 bg-gray-800"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </a>

              {/* Right Mini Grid (up to 3 images) */}
              <div className="bg-[#222222] rounded-lg p-2">
                <div className="grid grid-cols-3 gap-2">
                  {miniImages.slice(0, 3).map((image, index) => (
                    <a
                      key={index}
                      href={image.source_url || image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="overflow-hidden rounded-lg"
                    >
                      <img
                        src={image.url}
                        alt={image.alt}
                        className="w-full aspect-square object-cover hover:scale-105 transition-transform duration-300 bg-gray-800"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </a>
                  ))}
                </div>
                {hasMoreImages && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-[#0095FF] hover:text-[#0080FF] transition-colors mt-2"
                  >
                    View More
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
