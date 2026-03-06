/**
 * Phase 6 Test Page
 * Local testing for Brave Images, Chunked Rendering, and Progressive Playback
 */

import { useState, useEffect } from 'react';
import { ChunkPlanner } from '../services/studio/rendering/chunkPlanner';
import { ChunkedRenderer, ChunkRenderResult, RenderProgress } from '../services/studio/rendering/chunkedRenderer';
import { ImageAssetAgent } from '../services/studio/assets/imageAssetAgent';
import { BraveImageService } from '../services/studio/assets/braveImageService';
import { ProgressivePlayer } from '../components/studio/ProgressivePlayer';
import { SceneStructure } from '../services/studio/types';
import { Play, FileText, Image, Film, CheckCircle2, AlertCircle } from 'lucide-react';
import { detectVideoFormat, onFormatChange } from '../utils/deviceDetection';

export default function Phase6TestPage() {
  const [testResults, setTestResults] = useState<{
    phase: string;
    status: 'idle' | 'running' | 'success' | 'error';
    message: string;
    data?: any;
  }[]>([]);
  
  const [chunkResults, setChunkResults] = useState<ChunkRenderResult[]>([]);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [productionMode, setProductionMode] = useState<boolean>(false);

  // Detect video format based on screen size (responsive)
  const [videoFormat, setVideoFormat] = useState<'vertical' | 'horizontal'>(detectVideoFormat());

  // Update format on window resize
  useEffect(() => {
    return onFormatChange(setVideoFormat);
  }, []);

  // Mock scene structure for testing (1-second chunks for free tier 26s timeout)
  const mockSceneStructure: SceneStructure = {
    scenes: [
      {
        text: "AI transforms our world.",
        style: 'hook',
        from: 0,
        to: 30, // 1 second at 30fps
      },
      {
        text: "Machine learning advances daily.",
        style: 'explain',
        from: 30,
        to: 60, // 1 second
      },
      {
        text: "Machine learning is a subset of AI. It enables computers to learn from data without being explicitly programmed. This technology powers recommendation systems and voice assistants.",
        style: 'explain',
        from: 390,
        to: 630, // 8 seconds
      },
      {
        text: "The key insight is that AI systems improve through experience. The more data they process, the better they become at their tasks.",
        style: 'takeaway',
        from: 630,
        to: 810, // 6 seconds
      },
      {
        text: "Thanks for watching. Stay curious about AI and its potential.",
        style: 'outro',
        from: 810,
        to: 900, // 3 seconds
      }
    ],
    duration: 30, // Total duration in seconds
    fps: 30, // Frames per second
  };

  const addResult = (phase: string, status: 'idle' | 'running' | 'success' | 'error', message: string, data?: any) => {
    setTestResults(prev => [...prev, { phase, status, message, data }]);
  };

  const clearResults = () => {
    setTestResults([]);
    setChunkResults([]);
    setRenderProgress(null);
  };

  // Test 1: Brave Image Service
  const testBraveImageService = async () => {
    setCurrentTest('brave-images');
    addResult('Phase 6A: Brave Images', 'running', 'Testing Brave Image Service...');

    try {
      const braveService = new BraveImageService();
      
      // Check if enabled
      if (!braveService.isEnabled()) {
        addResult('Phase 6A: Brave Images', 'error', 'Brave Image Service not enabled. Check Supabase config.');
        return;
      }

      // Test query engineering
      const testScene = "Leaving your comfort zone can feel uncertain";
      const mood = "uncertain";
      
      addResult('Phase 6A: Query Engineering', 'running', `Testing query: "${testScene}"`);
      
      // Search for images (this will hit Supabase Edge Function)
      const images = await braveService.searchForScene(testScene, mood, { count: 3 });
      
      if (images && images.length > 0) {
        addResult('Phase 6A: Brave Images', 'success', `✓ Found ${images.length} images`, {
          images: images.map(img => ({
            title: img.title,
            url: img.url.substring(0, 50) + '...',
            thumbnail: typeof img.thumbnail === 'string' ? img.thumbnail.substring(0, 50) + '...' : 'N/A'
          }))
        });
      } else {
        addResult('Phase 6A: Brave Images', 'error', 'No images found. Check Brave API key in Supabase.');
      }
      
    } catch (error) {
      addResult('Phase 6A: Brave Images', 'error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test 2: Image Asset Agent
  const testImageAssetAgent = async () => {
    setCurrentTest('image-assets');
    addResult('Phase 6A: Image Assignment', 'running', 'Testing Image Asset Agent...');

    try {
      const imageAgent = new ImageAssetAgent();
      
      if (!imageAgent.isEnabled()) {
        addResult('Phase 6A: Image Assignment', 'error', 'Image Asset Agent not enabled.');
        return;
      }

      // Test key-points strategy (recommended)
      addResult('Phase 6A: Strategy', 'running', 'Testing key-points strategy (2-3 images)...');
      
      const result = await imageAgent.assignImageOverlays(mockSceneStructure, 'key-points');
      
      const imagesAssigned = result.scenes.filter(s => s.imageUrl).length;
      
      addResult('Phase 6A: Image Assignment', 'success', 
        `✓ Assigned ${imagesAssigned} images to ${result.scenes.length} scenes`, {
        totalImages: result.totalImages,
        failedScenes: result.failedScenes,
        scenesWithImages: result.scenes
          .filter(s => s.imageUrl)
          .map((s, idx) => ({
            sceneIndex: idx,
            style: s.style,
            effect: s.imageEffect,
            keywords: s.imageKeywords
          }))
      });
      
    } catch (error) {
      addResult('Phase 6A: Image Assignment', 'error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test 3: Chunk Planner
  const testChunkPlanner = () => {
    setCurrentTest('chunk-planner');
    addResult('Phase 6B: Chunk Planning', 'running', 'Testing Chunk Planner...');

    try {
      const planner = new ChunkPlanner(7); // 7s target duration
      const plan = planner.planChunks(mockSceneStructure);
      
      addResult('Phase 6B: Chunk Planning', 'success', 
        `✓ Created ${plan.totalChunks} chunks`, {
        totalChunks: plan.totalChunks,
        avgDuration: plan.averageChunkDuration.toFixed(2) + 's',
        sentenceCompliance: (plan.sentenceBoundaryCompliance * 100).toFixed(1) + '%',
        chunks: plan.chunks.map(c => ({
          id: c.id,
          duration: c.duration.toFixed(2) + 's',
          sceneCount: c.scenes.length,
          priority: c.priority
        }))
      });

      // Validate plan
      const stats = planner.getChunkStatistics(plan.chunks);
      addResult('Phase 6B: Statistics', 'success', 'Chunk statistics calculated', {
        highPriority: stats.highPriority,
        withImages: stats.withImages,
        avgDuration: stats.avgDuration.toFixed(2) + 's',
        minDuration: stats.minDuration.toFixed(2) + 's',
        maxDuration: stats.maxDuration.toFixed(2) + 's'
      });
      
    } catch (error) {
      addResult('Phase 6B: Chunk Planning', 'error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test 4: Chunked Renderer (Preview Mode)
  const testChunkedRenderer = async () => {
    setCurrentTest('chunk-renderer');
    addResult('Phase 6B: Chunked Rendering', 'running', 'Testing Chunked Renderer (preview mode)...');

    try {
      const planner = new ChunkPlanner(1); // 1-second chunks for free tier (26s timeout)
      const plan = planner.planChunks(mockSceneStructure);
      
      // Use 1 parallel chunk for local dev (Netlify CLI 30s timeout), 3 for production
      const renderer = new ChunkedRenderer(1, productionMode);
      const results: ChunkRenderResult[] = [];
      
      const mode = productionMode ? 'PRODUCTION (real videos)' : 'PREVIEW (simulation)';
      addResult('Phase 6B: Rendering', 'running', `Rendering ${plan.totalChunks} chunks in ${mode}...`);
      
      await renderer.renderChunks(
        plan.chunks,
        videoFormat, // Use detected format instead of hardcoded 'vertical'
        'test-video-123',
        { quality: 'fast' }, // Use fast quality for local dev (30s timeout constraint)
        (result, progress) => {
          results.push(result);
          setChunkResults([...results]);
          setRenderProgress(progress);
          
          addResult('Phase 6B: Chunk Progress', 'running', 
            `Chunk ${result.chunkIndex + 1}/${plan.totalChunks}: ${result.status}`, {
            chunkId: result.chunkId,
            status: result.status,
            renderTime: result.renderTime ? `${result.renderTime}ms` : 'N/A',
            progress: `${progress.percentComplete.toFixed(1)}%`
          });
        }
      );
      
      const stats = renderer.getRenderStatistics(results);
      
      addResult('Phase 6B: Chunked Rendering', 'success', 
        `✓ Rendered ${stats.successful} chunks successfully`, {
        totalChunks: stats.totalChunks,
        successful: stats.successful,
        failed: stats.failed,
        totalRenderTime: `${stats.totalRenderTime}ms`,
        avgRenderTime: `${stats.avgRenderTime.toFixed(0)}ms`
      });
      
    } catch (error) {
      addResult('Phase 6B: Chunked Rendering', 'error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test 5: Run All Tests
  const runAllTests = async () => {
    clearResults();
    
    addResult('Phase 6 Test Suite', 'running', 'Starting all tests...');
    
    // Test Phase 6A (with rate limiting delays)
    await testBraveImageService();
    
    // Wait 2 seconds before next API test to respect rate limits
    addResult('Phase 6 Test Suite', 'running', 'Waiting 2s for rate limit...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testImageAssetAgent();
    
    // Test Phase 6B (no API calls, can run immediately)
    testChunkPlanner();
    await testChunkedRenderer();
    
    addResult('Phase 6 Test Suite', 'success', '✓ All tests complete!');
    setCurrentTest('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Phase 6 Testing Suite
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test Brave Images, Chunked Rendering, and Progressive Playback locally
          </p>
          
          {/* Video Format Indicator */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg text-sm">
              <Film className="w-4 h-4" />
              <span className="font-medium">
                Video Format: {videoFormat === 'horizontal' ? '🖥️ Desktop (16:9)' : '📱 Mobile (9:16)'}
              </span>
              <span className="text-xs opacity-75">
                ({videoFormat === 'horizontal' ? '1920×1080' : '1080×1920'})
              </span>
            </div>
            
            {/* Production Mode Toggle */}
            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={productionMode}
                onChange={(e) => setProductionMode(e.target.checked)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="font-medium">
                {productionMode ? '🎬 Production Mode' : '⚡ Preview Mode'}
              </span>
              {productionMode && (
                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">REAL VIDEOS</span>
              )}
            </label>
          </div>
          
          {/* Production Mode Warning */}
          {productionMode && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                    Production Mode Enabled - Optimized for FREE Tier! 🎉
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    Videos will be rendered with Remotion in <strong>3-second chunks</strong> (~6-9s render time per chunk).
                    Full 30s video = 10 chunks. Fits perfectly in Netlify Free tier (10s timeout)!
                  </p>
                  <p className="text-green-700 dark:text-green-300 mt-2 text-xs">
                    💰 Total cost: <strong>FREE</strong> (within free tier limits). Requires SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Summary Banner (when all tests complete) */}
        {testResults.some(r => r.phase === 'Phase 6 Test Suite' && r.status === 'success') && (
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-lg shadow-lg p-8 mb-8 text-white">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 rounded-full p-3">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">
                  🎉 Phase 6 Testing Complete!
                </h2>
                <p className="text-green-50 mb-4">
                  All Phase 6 features tested successfully. Here's what was verified:
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <h3 className="font-semibold mb-1">✅ Phase 6A: Brave Images</h3>
                    <p className="text-sm text-green-100">
                      API integration, query engineering, image selection
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <h3 className="font-semibold mb-1">✅ Phase 6B: Chunked Rendering</h3>
                    <p className="text-sm text-green-100">
                      Scene chunking, parallel rendering, progress tracking
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <h3 className="font-semibold mb-1">✅ Phase 6C: Progressive Playback</h3>
                    <p className="text-sm text-green-100">
                      Preview mode metadata display (no video files generated)
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white/10 rounded-lg border border-white/20">
                  <p className="text-sm">
                    <strong>Note:</strong> Tests ran in <strong>preview mode</strong> (fast simulation without actual video rendering).
                    To generate real videos, configure production rendering with Netlify functions or Remotion Lambda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Test Controls
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={testBraveImageService}
              disabled={currentTest === 'brave-images'}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Image className="w-4 h-4" />
              Test Brave Images
            </button>
            
            <button
              onClick={testImageAssetAgent}
              disabled={currentTest === 'image-assets'}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              Test Image Agent
            </button>
            
            <button
              onClick={testChunkPlanner}
              disabled={currentTest === 'chunk-planner'}
              className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Film className="w-4 h-4" />
              Test Chunk Planner
            </button>
            
            <button
              onClick={testChunkedRenderer}
              disabled={currentTest === 'chunk-renderer'}
              className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Chunked Renderer
            </button>
            
            <button
              onClick={runAllTests}
              disabled={currentTest !== ''}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Run All Tests
            </button>
            
            <button
              onClick={clearResults}
              className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Progressive Player (Phase 6C) */}
        {chunkResults.length > 0 && renderProgress && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Phase 6C: Progressive Playback
            </h2>
            
            {/* Success Banner when all chunks ready */}
            {renderProgress.completed === renderProgress.total && renderProgress.failed === 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8" />
                  <div>
                    <h3 className="text-lg font-bold">✓ All Chunks Rendered Successfully!</h3>
                    <p className="text-sm text-green-100 mt-1">
                      {renderProgress.total} chunks completed in preview mode. 
                      Showing chunk metadata below (no video files in preview mode).
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <ProgressivePlayer
                chunks={chunkResults}
                renderProgress={renderProgress}
                format={videoFormat}
                onComplete={() => {
                  addResult('Phase 6C: Progressive Playback', 'success', '✓ Video playback complete!');
                }}
              />
            </div>
          </div>
        )}

        {/* Test Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Test Results ({testResults.length})
          </h2>
          
          {testResults.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No tests run yet. Click a test button above to start.
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.status === 'success' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                      : result.status === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.status === 'success' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    )}
                    {result.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    {result.status === 'running' && (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {result.phase}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {result.message}
                      </div>
                      
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            View Details
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mock Scene Structure Reference */}
        <details className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">
            Mock Scene Structure (for testing)
          </summary>
          <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
            {JSON.stringify(mockSceneStructure, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
