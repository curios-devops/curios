/**
 * Product Card Component
 * Displays a single Amazon product with image, title, price, and description
 */

import { AmazonProduct } from '../../services/amazon-api';

interface ProductCardProps {
  product: AmazonProduct;
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    // Open product in new tab
    window.open(product.productUrl, '_blank', 'noopener,noreferrer');
  };

  const formatRating = (rating?: number) => {
    if (!rating) return null;
    return rating.toFixed(1);
  };

  const formatReviewCount = (count?: number) => {
    if (!count) return null;
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <button
      onClick={handleClick}
      className="group flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 overflow-hidden text-left w-full cursor-pointer"
      aria-label={`View ${product.title} on Amazon`}
    >
      {/* Product Image */}
      <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
        {/* Price Badge (overlaid on image) */}
        <div className="absolute top-2 right-2 bg-blue-600 dark:bg-blue-500 text-white px-2 py-1 rounded-md text-sm font-bold shadow-md">
          {product.price}
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {product.title}
        </h3>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-yellow-500 dark:text-yellow-400">★</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formatRating(product.rating)}
            </span>
            {product.reviewCount && (
              <span className="text-gray-500 dark:text-gray-400">
                ({formatReviewCount(product.reviewCount)})
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 flex-1">
          {product.description}
        </p>

        {/* View on Amazon Link */}
        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium mt-auto pt-2">
          <span>View on Amazon</span>
          <svg
            className="w-3 h-3 group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}
