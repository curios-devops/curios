import React, { useState, useEffect, useRef } from 'react';
import { Compass, Image, List, Globe, ChevronDown, Wand2, Loader2 } from 'lucide-react';
import { useAccentColor } from '../hooks/useAccentColor';
import { useSession } from '../hooks/useSession';
import { useSubscription } from '../hooks/useSubscription';
import { useProQuota } from '../hooks/useProQuota';
import { generateArticleImage, extractArticleSummary } from '../services/research/regular/agents/imageGenerationService';
import ImageGenerationModal from './common/ImageGenerationModal';
import SignInModal from './auth/SignInModal';
import ProModal from './subscription/ProModal';

// Helper function to calculate reading and listening time
const calculateReadingTime = (text: string) => {
  const wordsPerMinute = 200;
  const listeningWordsPerMinute = 150;
  
  // Strip HTML and markdown, count words
  const plainText = text
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = plainText.split(' ').filter(word => word.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  // Calculate listening time in minutes and seconds
  const totalListeningSeconds = Math.ceil(words / listeningWordsPerMinute * 60);
  const listeningMinutes = Math.floor(totalListeningSeconds / 60);
  const listeningSeconds = totalListeningSeconds % 60;
  
  return { 
    readingTime, 
    listeningTime: `${listeningMinutes}:${String(listeningSeconds).padStart(2, '0')}` 
  };
};

// Helper function to format current date and time
const getCurrentDateTime = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return now.toLocaleDateString('en-US', options).toUpperCase();
};

interface TabSystemProps {
  result: any;
  progressState: any;
  loading: boolean;
  focusCategory?: string;
  onFocusChange?: (newFocus: string) => void;
}

interface SourceItemProps {
  source: any;
  index: number;
}

const SourceItem: React.FC<SourceItemProps> = ({ source, index }) => (
  <div className="flex gap-4 p-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <div className="flex-1">
      <div className="flex items-start gap-4">
        <span className="text-[#0095FF] font-semibold text-base bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full min-w-[32px] text-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-medium text-[#0095FF] dark:text-[#0095FF] mb-1 hover:underline cursor-pointer line-clamp-2">
            {source.title}
          </h3>
          <div className="text-sm text-green-700 dark:text-green-400 mb-3 truncate">
            {source.url}
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {source.snippet}
          </p>
        </div>
      </div>
    </div>
    
    {/* Image on the right */}
    {source.image && (
      <div className="flex-shrink-0 ml-4">
        <img 
          src={source.image} 
          alt=""
          className="w-24 h-18 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
        />
      </div>
    )}
  </div>
);

export const TabSystem: React.FC<TabSystemProps> = ({ result, progressState, loading, focusCategory, onFocusChange }) => {
  const [activeTab, setActiveTab] = useState<'curios' | 'steps' | 'sources' | 'images'>('curios');
  const [showFocusDropdown, setShowFocusDropdown] = useState(false);
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0);
  const [validImageIndices, setValidImageIndices] = useState<number[]>([]); // Track which images successfully load
  const [isValidatingImages, setIsValidatingImages] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isHDEnabled, setIsHDEnabled] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const imageModalTimeoutRef = useRef<number | null>(null);
  const accent = useAccentColor();
  const { session } = useSession();
  const { subscription } = useSubscription(session);
  const { remainingQuota, decrementProQuota } = useProQuota();

  // Determine user type
  const getUserType = (): 'guest' | 'free' | 'premium' => {
    if (!session) return 'guest';
    return subscription?.isActive ? 'premium' : 'free';
  };

  const userType = getUserType();

  // Focus category options
  const focusCategories = [
    { id: 'ANALYSIS', label: 'ANALYSIS' },
    { id: 'ARTS', label: 'ARTS & ENTERTAINMENT' },
    { id: 'BUSINESS', label: 'BUSINESS & INNOVATION' },
    { id: 'HEALTH & SPORT', label: 'HEALTH & SPORT' },
    { id: 'SCIENCES & TECH', label: 'SCIENCES & TECH' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFocusDropdown(false);
      }
    };

    if (showFocusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFocusDropdown]);

  // Validate images on load - only show images that successfully load
  useEffect(() => {
    if (!result?.images || result.images.length === 0) {
      setValidImageIndices([]);
      setFeaturedImageIndex(0);
      return;
    }

    setIsValidatingImages(true);
    console.log(`🖼️ [IMAGE-VALIDATION] Validating ${result.images.length} images...`);

    // Test each image URL
    const validateImage = (url: string, index: number): Promise<number | null> => {
      return new Promise((resolve) => {
        const img = document.createElement('img') as HTMLImageElement;
        img.onload = () => {
          console.log(`✅ [IMAGE-VALIDATION] Image ${index} loaded successfully:`, url);
          resolve(index);
        };
        img.onerror = () => {
          console.warn(`❌ [IMAGE-VALIDATION] Image ${index} failed to load:`, url);
          resolve(null);
        };
        // Set timeout to avoid hanging on slow images
        setTimeout(() => {
          console.warn(`⏱️ [IMAGE-VALIDATION] Image ${index} timed out:`, url);
          resolve(null);
        }, 5000);
        img.src = url;
      });
    };

    // Validate all images in parallel
    Promise.all(
      result.images.map((img: any, index: number) => validateImage(img.url, index))
    ).then((results) => {
      const validIndices = results.filter((idx): idx is number => idx !== null);
      console.log(`🖼️ [IMAGE-VALIDATION] ${validIndices.length}/${result.images.length} images are valid`);
      setValidImageIndices(validIndices);
      
      // Set featured image to first valid image
      if (validIndices.length > 0) {
        setFeaturedImageIndex(validIndices[0]);
      }
      
      setIsValidatingImages(false);
    });
  }, [result?.images]);

  // Handle follow-up question clicks
  const handleFollowUpClick = (question: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', question);
    searchParams.set('type', 'insights');
    // Force page reload to trigger new insights workflow
    window.location.href = `/insights-results?${searchParams.toString()}`;
  };

  // Handle image generation modal on hover
  const handleImageButtonMouseEnter = () => {
    // Clear any existing timeout
    if (imageModalTimeoutRef.current) {
      clearTimeout(imageModalTimeoutRef.current);
      imageModalTimeoutRef.current = null;
    }
    setShowImageModal(true);
  };

  const handleImageButtonMouseLeave = () => {
    // Don't close immediately - wait to see if user moves to modal
    imageModalTimeoutRef.current = window.setTimeout(() => {
      setShowImageModal(false);
    }, 300);
  };

  const handleImageModalMouseEnter = () => {
    // Clear any pending close timeout when entering modal
    if (imageModalTimeoutRef.current) {
      clearTimeout(imageModalTimeoutRef.current);
      imageModalTimeoutRef.current = null;
    }
  };

  const handleImageModalMouseLeave = () => {
    // Close modal after a delay when leaving modal area
    imageModalTimeoutRef.current = window.setTimeout(() => {
      setShowImageModal(false);
    }, 300);
  };

  const handleImageModalClose = () => {
    // Clear any timeouts and close immediately
    if (imageModalTimeoutRef.current) {
      clearTimeout(imageModalTimeoutRef.current);
      imageModalTimeoutRef.current = null;
    }
    setShowImageModal(false);
  };

  // Handle HD toggle - only for signed-in users
  const handleHDToggle = () => {
    // Guests need to sign in
    if (userType === 'guest') {
      setShowImageModal(false);
      setShowSignInModal(true);
      return;
    }
    
    // Free users: check quota before enabling HD
    if (userType === 'free' && !isHDEnabled) {
      if (remainingQuota === 0) {
        setShowImageModal(false);
        setShowProModal(true);
        return;
      }
    }
    
    // Toggle HD state
    setIsHDEnabled(!isHDEnabled);
  };

  // Handle image generation - FREE for everyone, HD uses quota for free users
  const handleGenerateImage = async (useHD: boolean) => {
    console.log('🎨 [Image Generation] Generate clicked', { useHD, userType });
    
    if (!result) {
      console.error('❌ [Image Generation] No result available');
      return;
    }
    
    if (isGeneratingImage) {
      console.warn('⚠️ [Image Generation] Already generating, skipping');
      return;
    }

    // Only decrement quota if using HD and user is free tier
    if (userType === 'free' && useHD) {
      if (remainingQuota === 0) {
        setShowImageModal(false);
        setShowProModal(true);
        return;
      }
      // Decrement quota
      await decrementProQuota();
    }

    console.log('📊 [Image Generation] Starting generation with data:', {
      headline: result.headline,
      focus: focusCategory || result.focus_category,
      hasMarkdown: !!result.markdown_report,
      useHD,
      quality: useHD ? 'hd' : 'standard'
    });

    try {
      setIsGeneratingImage(true);
      setShowImageModal(false); // Close modal when generating
      console.log('⏳ [Image Generation] Loading state set to true');
      
      const summary = extractArticleSummary(result.markdown_report || '');
      console.log('📝 [Image Generation] Extracted summary:', summary.substring(0, 100) + '...');
      
      console.log('🚀 [Image Generation] Calling generateArticleImage...');
      const imageResult = await generateArticleImage({
        articleTitle: result.headline,
        articleSummary: summary,
        focusCategory: (focusCategory || result.focus_category) as any
      });

      console.log('✅ [Image Generation] Image generated successfully:', imageResult.url);
      setGeneratedImageUrl(imageResult.url);
      console.log('💾 [Image Generation] Image URL saved to state');
    } catch (error) {
      console.error('❌ [Image Generation] Failed:', error);
      if (error instanceof Error) {
        console.error('❌ [Image Generation] Error message:', error.message);
        console.error('❌ [Image Generation] Error stack:', error.stack);
      }
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingImage(false);
      console.log('✅ [Image Generation] Loading state set to false');
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (imageModalTimeoutRef.current) {
        clearTimeout(imageModalTimeoutRef.current);
      }
    };
  }, []);

  const tabs = [
    { 
      id: 'curios', 
      label: 'Curios AI',
      icon: <Compass size={16} />,
      customLabel: (
        <span>
          Curios<span style={{ color: accent.primary }}>AI</span>
        </span>
      )
    },
    // Only show images tab if we have valid images
    ...(validImageIndices.length > 0 ? [{
      id: 'images', 
      label: `Images · ${validImageIndices.length}`,
      icon: <Image size={16} />
    }] : []),
    { 
      id: 'steps', 
      label: 'Steps',
      icon: <List size={16} />
    },
    { 
      id: 'sources', 
      label: `Sources${result?.sources ? ` · ${result.sources.length}` : ''}`,
      icon: <Globe size={16} />
    }
  ];

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              style={activeTab === tab.id ? { color: accent.primary } : {}}
            >
              <span 
                className="text-base flex items-center"
                style={activeTab === tab.id ? { color: accent.primary } : {}}
              >
                {tab.icon}
              </span>
              <span className="hidden sm:inline">
                {tab.customLabel || tab.label}
              </span>
              <span className="sm:hidden">
                {tab.customLabel ? (
                  <span>
                    Curios<span style={{ color: accent.primary }}>AI</span>
                  </span>
                ) : (
                  tab.label.split(' ')[0]
                )}
              </span>
              {activeTab === tab.id && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: accent.primary }}
                ></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'curios' && (
          <div className="space-y-6">
            {/* Focus Category Selector - Part of Curios Tab */}
            <div className="-mx-6 px-6 -mt-6 mb-6 pt-6">
              <div className="flex items-center gap-3 relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    console.log('🎯 [FOCUS-BUTTON] Button state:', {
                      focusCategory,
                      resultFocusCategory: result?.focus_category,
                      displayed: focusCategory || result?.focus_category || 'ANALYSIS'
                    });
                    setShowFocusDropdown(!showFocusDropdown);
                  }}
                  title="Select topic category"
                  className="px-3 py-1 text-sm font-medium uppercase tracking-wider transition-colors flex items-center gap-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                >
                  {focusCategory || result?.focus_category || 'ANALYSIS'}
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {/* Dropdown Menu */}
                {showFocusDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-10 min-w-[200px] rounded-md overflow-hidden">
                    {focusCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setShowFocusDropdown(false);
                          if (category.id !== (focusCategory || result?.focus_category || 'ANALYSIS')) {
                            onFocusChange?.(category.id);
                          }
                        }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          category.id === (focusCategory || result?.focus_category || 'ANALYSIS')
                            ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!loading && result ? (
              <>
                {/* News Article Header */}
                <div className="space-y-4">
                  {/* Date and Time */}
                  <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    {getCurrentDateTime()}
                  </div>
                  
                  {/* Headline */}
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                    {result.headline || 'Breaking Analysis'}
                  </h1>
                  
                  {/* Subtitle */}
                  {result.subtitle && (
                    <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                      {result.subtitle}
                    </p>
                  )}

                  {/* Featured Image - First image from results with fallback, or generated image */}
                  {result && (
                    <div className="my-6 relative group">
                      {/* Only show image container if we have an image to display */}
                      {/* Image Container - Only show if we have a valid image or generated image */}
                      {(generatedImageUrl || (validImageIndices.length > 0 && !isValidatingImages)) && (
                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative mb-3">

                          {/* Image */}
                          <img
                            src={generatedImageUrl || result.images[featuredImageIndex].url}
                            alt={result.images[featuredImageIndex]?.alt || result.headline || 'Featured image'}
                            className="w-full h-auto max-h-[500px] object-cover"
                            onError={() => {
                              console.warn('🖼️ [IMAGE-ERROR] Image failed to load:', generatedImageUrl || result.images[featuredImageIndex]?.url);
                              
                              if (generatedImageUrl) {
                                // Generated image failed, clear it
                                console.log('🖼️ [IMAGE-ERROR] Clearing failed generated image');
                                setGeneratedImageUrl(null);
                                return;
                              }
                              
                              // Try next valid image
                              const currentIndexInValid = validImageIndices.indexOf(featuredImageIndex);
                              const nextValidIndex = validImageIndices[currentIndexInValid + 1];
                              
                              if (nextValidIndex !== undefined) {
                                console.log(`🖼️ [IMAGE-ERROR] Switching to next valid image: index ${nextValidIndex}`);
                                setFeaturedImageIndex(nextValidIndex);
                              } else {
                                console.log('🖼️ [IMAGE-ERROR] No more valid images available');
                                // Remove this image from valid indices
                                setValidImageIndices(validImageIndices.filter(idx => idx !== featuredImageIndex));
                              }
                            }}
                            onLoad={() => {
                              if (generatedImageUrl) {
                                console.log(`✅ [IMAGE-LOAD] Generated image loaded successfully`);
                              } else {
                                console.log(`✅ [IMAGE-LOAD] Search image ${featuredImageIndex} loaded successfully`);
                              }
                            }}
                          />

                          {/* Loading Overlay */}
                          {isGeneratingImage && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                              <Loader2 size={48} className="animate-spin text-white mb-4" />
                              <p className="text-white text-center px-4 text-sm md:text-base">
                                Generating image for your article...<br />
                                <span className="text-white/70">This could take some seconds...</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Image generation controls and Listen - always show when there's a result */}
                      <div className="flex justify-between items-center mt-3">
                        {/* Listen to article section - left side */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          {(() => {
                            const { listeningTime } = calculateReadingTime(result.markdown_report || '');
                            return (
                              <div className="flex items-center gap-2">
                                <span>🎧</span>
                                <span>Listen to this article · {listeningTime} min</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Generate Image button - right side */}
                        <div className="relative">
                          <button
                            data-image-gen-button
                            onMouseEnter={handleImageButtonMouseEnter}
                            onMouseLeave={handleImageButtonMouseLeave}
                            disabled={isGeneratingImage}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Wand2 size={18} style={{ color: accent.primary }} />
                          </button>

                          {/* Image Generation Modal */}
                          {showImageModal && (
                            <ImageGenerationModal
                              userType={userType}
                              remainingQuota={remainingQuota}
                              isHDEnabled={isHDEnabled}
                              onHDToggle={handleHDToggle}
                              onGenerate={handleGenerateImage}
                              onUpgrade={() => {
                                setShowImageModal(false);
                                setShowProModal(true);
                              }}
                              onSignIn={() => {
                                setShowImageModal(false);
                                setShowSignInModal(true);
                              }}
                              onClose={handleImageModalClose}
                              onMouseEnter={handleImageModalMouseEnter}
                              onMouseLeave={handleImageModalMouseLeave}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Article Body */}
                <div className="prose dark:prose-invert max-w-none">
                  <div 
                    className="text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: result.markdown_report
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>')
                        // More comprehensive # removal - handles "# Text" or "## Text" at start of lines
                        .replace(/^#{1,6}\s*/gm, '')
                        .replace(/<br\s*\/?>\s*#{1,6}\s*/g, '<br/>')
                        .replace(/#{1,6}\s*(.*?)<br\/>/g, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                        .replace(/#{1,6}\s*(.*?)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                        // Convert standalone bold text (likely headers) to proper headers  
                        .replace(/<br\/><strong>([^<]+)<\/strong><br\/>/g, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                    }} 
                  />
                </div>

                {/* Follow-up Questions */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Follow-up Questions</h2>
                  <div className="space-y-3">
                    {result.follow_up_questions.map((q: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleFollowUpClick(q)}
                        className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            {q}
                          </span>
                          <svg 
                            className="w-4 h-4 text-gray-400 group-hover:text-[#0095FF] transition-colors" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  {loading ? 'Generating comprehensive report...' : 'No results available'}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Research Process</h2>
            </div>
            
            {/* Process Steps - now first */}
            {progressState?.thinkingSteps && progressState.thinkingSteps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Process Steps</h3>
                <div className="relative">
                  {/* Vertical connecting line */}
                  {progressState.thinkingSteps.length > 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                  )}
                  
                  <div className="space-y-4">
                    {progressState.thinkingSteps.map((step: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 relative">
                        <div className="relative z-10 w-6 h-6 bg-[#0095FF] rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="text-white text-xs font-bold">✓</div>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 pt-0.5">{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Queries - now second */}
            {result?.search_queries && result.search_queries.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Search Queries</h3>
                <div className="space-y-2">
                  {result.search_queries.map((query: string, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-6 h-6 bg-[#0095FF] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{query}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!progressState?.thinkingSteps || progressState.thinkingSteps.length === 0) && (!result?.search_queries || result.search_queries.length === 0) && !loading && (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">No process steps available</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sources</h2>
            
            {result?.sources && result.sources.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {result.sources.map((source: any, index: number) => (
                  <SourceItem key={index} source={source} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  {loading ? 'Gathering sources...' : 'No sources available'}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Images ({validImageIndices.length})
            </h2>
            
            {validImageIndices.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {validImageIndices.map((imageIndex: number) => {
                  const image = result.images[imageIndex];
                  return (
                    <div key={imageIndex} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group relative">
                      <img
                        src={image.url}
                        alt={image.alt || `Image ${imageIndex + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(image.url, '_blank')}
                        onError={() => {
                          console.warn(`🖼️ [IMAGES-TAB] Image ${imageIndex} failed at runtime, removing from valid list`);
                          // Remove from valid images if it fails at runtime
                          setValidImageIndices(prev => prev.filter(idx => idx !== imageIndex));
                        }}
                        onLoad={() => {
                          console.log(`✅ [IMAGES-TAB] Image ${imageIndex} loaded in gallery`);
                        }}
                      />
                      {/* Image number badge */}
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {imageIndex + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  {isValidatingImages ? 'Validating images...' : 'No valid images found for this search.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <SignInModal 
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        currentLanguage={{ code: 'en', name: 'English', flag: '🇺🇸' }}
        title="Sign In to Generate Images"
        subtitle="Create custom AI-generated images for your articles"
      />

      <ProModal 
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
      />
    </div>
  );
};

export default TabSystem;
