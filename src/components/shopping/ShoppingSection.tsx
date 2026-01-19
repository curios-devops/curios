/**
 * Shopping Section Component
 * Displays a grid of product cards when shopping intent is detected
 */

import { AmazonProduct } from '../../services/amazon-api';
import ProductCard from './ProductCard';

interface ShoppingSectionProps {
  products: AmazonProduct[];
  isLoading?: boolean;
}

export default function ShoppingSection({ products, isLoading }: ShoppingSectionProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="w-full aspect-square bg-gray-200 animate-pulse"></div>
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return null; // Don't show anything if no products
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Sponsored Products
        </h2>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.asin}
            product={product}
            onClick={() => {
              // Track click analytics here if needed
              console.log('Product clicked:', product.title);
            }}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Products are fetched from Amazon. Prices and availability may vary.
      </div>
    </div>
  );
}
