'use client';

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { orchestrateArtifact } from '../agents/labOrchestrator.ts';
import { ArrowLeft, FileText, Image, Gamepad2, ArrowRight, Layers, ChevronDown, ChevronUp, Check } from 'lucide-react';
import ShareMenu from '../../../../components/ShareMenu.tsx';
import { ARTIFACT_CATEGORIES, Artifact } from '../../../../commonApp/types/index.ts';
import LightMarkdown from '../../../../commonApp/components/LightMarkdown.tsx';

const CATEGORY_ICONS = {
  docs: <FileText className="w-5 h-5" />,
  images: <Image className="w-5 h-5" />,
  games: <Gamepad2 className="w-5 h-5" />,
};

export default function LabsResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  // Remove useArtifactGenerator
  // const { generateArtifact, isGenerating, error } = useArtifactGenerator();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<'docs' | 'images' | 'games' | 'data' | 'webs'>('docs');
  const [selectedType, setSelectedType] = useState<string>('doc');
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [stepLog, setStepLog] = useState<string[]>([]); // Agent's inner thought log
  const [_isGenerating, _setIsGenerating] = useState(false);
  const [_error, _setError] = useState<string | null>(null);

  // Check if this is Pro Labs based on URL parameters
  const isProLabs = searchParams.get('pro') === 'true';
  console.log('LabsResults: Pro mode detected:', isProLabs);

  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery && initialQuery.trim()) {
      handleGenerate(initialQuery);
    }
    // eslint-disable-next-line
  }, [searchParams]);

  // In handleGenerate, clear stepLog at start
  const handleGenerate = async (promptOverride?: string) => {
    const prompt = promptOverride || query;
    if (!prompt.trim()) return;
    setStepLog([]);
    setCurrentArtifact(null);
    try {
      // Use orchestrateArtifact to generate artifact with dynamic subtasks
      await orchestrateArtifact(prompt, (partial: Partial<Artifact>) => {
        setCurrentArtifact(partial as Artifact);
        // Collect agent thinking steps if present
        if (partial && Array.isArray(partial.thinkingLog ?? [])) {
          setStepLog((prev) => [...prev, ...(partial.thinkingLog ?? []).filter((msg: string) => !prev.includes(msg))]);
        }
      }, selectedType);
    } catch (_err: unknown) {
      // setError(err.message || 'Error generating artifact'); // Removed setError
    } finally {
      // setIsGenerating(false); // Removed setIsGenerating
    }
    setQuery('');
  };

  // Removed handleCategoryChange function

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    setCurrentArtifact(null);
    setStepLog([]);
    // setProgress(0); // Removed progress state
    // setStage('Starting'); // Removed stage state
    // setTimeRemaining('About 1 minute remaining'); // Removed timeRemaining state
  };

  const handleBack = () => navigate('/');

  const selectedCategoryData = ARTIFACT_CATEGORIES.find((cat) => cat.id === selectedCategory);
  const availableTypes = selectedCategoryData?.types || [];
  const selectedTypeData = availableTypes.find((type) => type.id === selectedType);

  // Helper to get research step citations
  // Task progress state for demo
  const [taskExpanded, setTaskExpanded] = useState(false);
  // Use real subtasks from currentArtifact.steps
  const steps = currentArtifact?.steps || [];
  const completedCount = steps.filter((s) => s.status === 'complete').length;

  return (
    <div className="min-h-screen bg-black text-white transition-colors duration-200">
      {/* Query as Title with Back and Share */}
      <header className="px-12 pt-8 pb-2 flex items-center justify-between">
        <button type="button" onClick={handleBack} className="text-blue-400 hover:text-blue-300 transition-colors mr-4">
          <ArrowLeft className="w-7 h-7" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2 text-left">{searchParams.get('q') || 'Labs'}</h1>
          <hr className="border-gray-700 mb-2" />
        </div>
        <div className="ml-4">
          <ShareMenu
            url={globalThis.location.href}
            title={`CuriosAI Labs: ${searchParams.get('q') || ''}`}
            text={currentArtifact?.content?.slice?.(0, 100) + '...' || ''}
          />
        </div>
      </header>
      <main className="w-full flex flex-row gap-8 px-12 pb-6 min-h-[calc(100vh-80px)]">
        {/* Left Column */}
        <section className="flex flex-col w-1/2 min-h-[calc(100vh-120px)] relative">
          {/* Category Selector Window */}
          <div className="bg-[#181a20] rounded-2xl p-6 shadow-lg mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-7 h-7 text-blue-400" /> Category
            </h2>
            <div className="flex gap-2 mb-4">
              {['docs', 'images', 'games'].map(cat => (
                <button
                  key={cat}
                  className={`flex flex-col items-center px-4 py-2 rounded-lg border transition ${
                    selectedCategory === cat
                      ? 'bg-[#0095FF] text-white border-[#0095FF]'
                      : 'bg-[#23232a] text-gray-300 border-gray-700 hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    setSelectedCategory(cat as 'docs' | 'images' | 'games' | 'data' | 'webs');
                    setSelectedType(ARTIFACT_CATEGORIES.find((c) => c.id === cat)?.types[0]?.id || '');
                  }}
                  type="button"
                >
                  {CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]}
                  <span className="text-xs mt-1 capitalize">{cat}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              {availableTypes.map((type) => (
                <button
                  key={type.id}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    selectedType === type.id
                      ? 'bg-[#0095FF] text-white border-[#0095FF]'
                      : 'bg-[#23232a] text-gray-300 border-gray-700 hover:bg-gray-800'
                  }`}
                  onClick={() => handleTypeChange(type.id)}
                  type="button"
                >
                  {type.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedTypeData?.description}</p>
          </div>
          {/* Planning Window (shorter, with margin below) */}
          <div className="bg-[#181a20] rounded-2xl p-6 shadow-lg flex flex-col gap-2 min-h-[180px] mb-4 overflow-y-auto" style={{ fontSize: '1.1rem', minHeight: '180px', maxHeight: '320px' }}>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              {/* Blue light bulb icon */}
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"/>
              </svg>
              Planning
            </h2>
            <div className="text-gray-300 text-sm flex-1 whitespace-pre-line" style={{overflowY: 'auto'}}>
              {currentArtifact?.planDetails && currentArtifact.planDetails.length > 0 ? (
                <ul className="relative pl-6">
                  {currentArtifact.planDetails.map((item, idx: number) => (
                    <li key={idx} className="mb-4 flex flex-col items-start relative">
                      {/* Connector line */}
                      {idx !== (currentArtifact.planDetails?.length ?? 0) - 1 && (
                        <span className="absolute left-1.5 top-6 w-px h-full bg-blue-700 opacity-40" style={{zIndex: 0}}></span>
                      )}
                      {/* Dot */}
                      <span className="w-3 h-3 rounded-full bg-blue-400 border-2 border-blue-700 mb-1" style={{zIndex: 1}}></span>
                      {/* Main step */}
                      <span className="font-medium text-white ml-2" style={{zIndex: 2}}>{item.step}</span>
                      {/* Detail */}
                      <span className="ml-6 text-xs text-blue-200 mt-1" style={{zIndex: 2}}>{item.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : stepLog.length === 0 ? (
                <span>The agent will show its reasoning here as it works...</span>
              ) : (
                stepLog
                  .filter(msg => !msg.includes('You can interrupt me at any time') && !/^\d+\. /.test(msg))
                  .map((msg, idx) => <LightMarkdown key={idx}>{msg}</LightMarkdown>)
              )}
            </div>
          </div>
          {/* Follow-up Input Window (sticky bottom, two lines tall, arrow centered) */}
          <div className="bg-[#181a20] rounded-2xl p-4 shadow-lg flex items-center sticky left-0 right-0 bottom-0 z-10" style={{ minHeight: '72px', marginTop: '18px', marginBottom: '18px' }}>
            <textarea
              rows={2}
              placeholder="Follow up..."
              className="w-full pl-5 pr-16 py-5 rounded-lg border border-gray-700 bg-[#23232a] text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base shadow-sm transition resize-none"
              style={{ fontFamily: 'inherit', minHeight: '56px', maxHeight: '72px' }}
            />
            <button
              type="button"
              className="absolute right-6 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center bg-[#007BFF] hover:bg-[#0056b3] transition-all duration-250 ease-in-out shadow-md"
              aria-label="Send follow up"
            >
              <ArrowRight size={18} className="text-white" />
            </button>
          </div>
        </section>
        {/* Right Column */}
        <section className="flex flex-col w-1/2 min-h-[calc(100vh-120px)] justify-end">
          <div className="bg-[#181a20] rounded-2xl p-8 shadow-2xl flex flex-col flex-1 min-h-[400px] relative justify-end" style={{ marginBottom: '0', height: '100%', paddingBottom: '36px' }}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 006.5 22h11a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0017.5 2h-11A2.5 2.5 0 004 4.5v15z" /><path d="M8 6h8M8 10h8M8 14h6" /></svg>
              Answer
            </h2>
            {/* Scrollable answer window, task progress always visible below */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="text-gray-200 text-base leading-relaxed flex-1 overflow-y-auto" style={{ minHeight: 0, maxHeight: 'calc(100vh - 320px)' }}>
                {currentArtifact?.content ? (
                  <div className="prose prose-invert max-w-none bg-[#181a20] rounded-xl p-6" style={{ minHeight: 0 }}>
                    <LightMarkdown>{currentArtifact.content}</LightMarkdown>
                  </div>
                ) : (
                  <span className="text-gray-500">The answer will appear here...</span>
                )}
              </div>
              {/* Collapsible Task Progress Window (always visible at bottom) */}
              <div className="px-6 pb-4 pt-2" style={{ background: 'transparent', minHeight: '72px', position: 'absolute', left: 0, right: 0, bottom: '14px' }}>
                <div
                  className="bg-[#23232a] border border-gray-700 rounded-xl shadow p-3 text-gray-200 text-sm cursor-pointer select-none flex flex-col gap-1"
                  onClick={() => setTaskExpanded((v) => !v)}
                  style={{ minHeight: '40px', transition: 'box-shadow 0.2s' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Task progress</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      {steps.length > 0 ? `${completedCount} / ${steps.length}` : '0 / 0'}
                      {taskExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>
                  {steps.length === 0 ? (
                    <div className="flex items-center gap-2 mt-2 text-gray-500">
                      No subtasks yet.
                    </div>
                  ) : taskExpanded ? (
                    <ul className="mt-2 space-y-1">
                      {steps.map((step, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          {step.status === 'complete' ? (
                            <Check className="text-green-400 w-4 h-4" />
                          ) : step.status === 'in_progress' && step.agentStatus ? (
                            <span className="w-4 h-4 rounded-full bg-blue-500 inline-block" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-gray-500 inline-block" />
                          )}
                          <span className={step.status === 'complete' ? 'text-green-400' : ''}>
                            {step.status === 'in_progress' && step.agentStatus && step.agentName
                              ? `${step.agentName} ${step.agentStatus}: ${step.name}`
                              : step.name}
                          </span>
                          {step.status === 'in_progress' && step.agentStatus && step.thinkingSince && (
                            null
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      {steps[steps.length - 1]?.status === 'complete' ? (
                        <Check className="text-green-400 w-4 h-4" />
                      ) : steps[steps.length - 1]?.status === 'in_progress' && steps[steps.length - 1]?.agentStatus ? (
                        <span className="w-4 h-4 rounded-full bg-blue-500 inline-block" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-gray-500 inline-block" />
                      )}
                      <span>
                        {steps[steps.length - 1]?.status === 'in_progress' && steps[steps.length - 1]?.agentStatus && steps[steps.length - 1]?.agentName
                          ? `${steps[steps.length - 1].agentName} ${steps[steps.length - 1].agentStatus}: ${steps[steps.length - 1].name}`
                          : steps[steps.length - 1]?.name || 'No subtasks yet.'}
                      </span>
                      {steps[steps.length - 1]?.status === 'in_progress' && steps[steps.length - 1]?.agentStatus && steps[steps.length - 1]?.thinkingSince && (
                        null
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
