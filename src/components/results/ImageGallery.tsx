// Image carousel + grid shared by Search, Movie 🍿 and Games 🎮 (moved from FastSearchResults).
import { useRef, useState, type SyntheticEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface GalleryImage { url: string; title: string; source: string }

export function ImagesCarousel({ images, featuredFirst = false }: { images: GalleryImage[]; featuredFirst?: boolean }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = 300;
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;

    containerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  const handleImageLoad = (index: number, e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions(prev => new Map(prev).set(index, { width: img.naturalWidth, height: img.naturalHeight }));
  };

  const getImageClass = (index: number) => {
    // Featured hero (Ask Deeper generated image) leads the carousel ~2 tiles wide.
    if (featuredFirst && index === 0) return 'w-80 h-40';

    const dims = imageDimensions.get(index);
    if (!dims) return 'w-48 h-40'; // Default landscape while loading

    const aspectRatio = dims.width / dims.height;
    const fixedHeight = 'h-40'; // Same height for all: 160px

    if (aspectRatio > 1.3) {
      // Landscape - wider
      return `w-56 ${fixedHeight}`;
    } else if (aspectRatio < 0.7) {
      // Portrait - narrower
      return `w-28 ${fixedHeight}`;
    } else {
      // Square
      return `w-40 ${fixedHeight}`;
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative group">
        {/* Left scroll button */}
        {scrollPosition > 0 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Carousel container */}
        <div
          ref={containerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory items-center"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((image, index) => (
            <a
              key={index}
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 snap-start"
            >
              <div className={`${getImageClass(index)} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors`}>
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onLoad={(e) => handleImageLoad(index, e)}
                  onError={(e) => {
                    // Broken image (e.g. SerpAPI full-res 404/hotlink-blocked):
                    // hide the whole tile so there's no empty box.
                    const tile = e.currentTarget.closest('a');
                    if (tile) (tile as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </a>
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
}

export function ImagesGrid({ images }: { images: GalleryImage[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {images.map((image, index) => (
        <a
          key={index}
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
            <img
              src={image.url}
              alt={image.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const tile = e.currentTarget.closest('a');
                if (tile) (tile as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </a>
      ))}
    </div>
  );
}
