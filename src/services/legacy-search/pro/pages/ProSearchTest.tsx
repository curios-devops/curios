import { useState } from 'react';
import { SearchRetrieverAgent } from '../../regular/agents/searchRetrieverAgent.ts';
// import { SwarmController } from '../agents/swarmController.ts';
import { PerspectiveAgent } from '../agents/perspectiveAgent.ts';

// Minimal Pro Search Test Page: Side-by-side Regular vs Pro Search for "Elon Musk"
export default function ProSearchTest() {
  const [regularPayload, setRegularPayload] = useState<any>(null);
  const [regularFirstResult, setRegularFirstResult] = useState<any>(null);
  const [proPayload, setProPayload] = useState<any>(null);
  const [proFirstResult, setProFirstResult] = useState<any>(null);
  const [perspectives, setPerspectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writerRegPayload, setWriterRegPayload] = useState<any>(null);
  const [writerProPayload, setWriterProPayload] = useState<any>(null);
  // Button: Writer RegPayload (Regular Search WriterAgent payload to OpenAI)
  const handleWriterRegPayload = async () => {
    setLoading(true);
    setError(null);
    setWriterRegPayload(null);
    try {
      const retriever = new SearchRetrieverAgent();
      const regResult = await retriever.execute('Elon Musk');
      // Prepare the same research object as used in WriterAgent
      const research = {
        query: 'Elon Musk',
        perspectives: [],
        results: regResult?.data?.results || [],
        images: regResult?.data?.images || [],
        videos: regResult?.data?.videos || [],
        isReverseImageSearch: regResult?.data?.isReverseImageSearch || false
      };
      // Reproduce the prompt payload (messages, model, etc.)
      // We mimic the logic in SearchWriterAgent.execute
      const maxResults = 8;
      const maxContentPerResult = 600;
      const extractSiteName = (url: string): string => {
        try {
          const domain = new URL(url).hostname;
          return domain.replace('www.', '').split('.')[0];
        } catch {
          return 'Unknown Site';
        }
      };
      const sourceContext = research.results
        .slice(0, maxResults)
        .map((result: any, index: number) => {
          let content = '';
          if ('content' in result && typeof result.content === 'string') {
            content = result.content;
          } else if ('snippet' in result && typeof result.snippet === 'string') {
            content = result.snippet;
          }
          const truncatedContent = content.length > maxContentPerResult
            ? content.slice(0, maxContentPerResult) + '...'
            : content;
          const siteName = extractSiteName(result.url);
          return `Source ${index + 1} - ${siteName}:\nURL: ${result.url}\nWebsite: ${siteName}\nTitle: ${result.title}\nContent: ${truncatedContent}\n---`;
        })
        .join('\n\n');
      const systemPrompt = `You are an expert research analyst creating comprehensive, well-sourced articles with intelligent follow-up questions.\n\nCRITICAL: You must base your content ONLY on the provided sources. Do not add information not found in the sources.\n\nRESPONSE FORMAT - Return a JSON object with this exact structure:\n{\n  "content": "Your comprehensive answer here...",\n  "followUpQuestions": [\n    "Follow-up question 1",\n    "Follow-up question 2",\n    "Follow-up question 3",\n    "Follow-up question 4",\n    "Follow-up question 5"\n  ],\n  "citations": [\n    {\n      "url": "url1",\n      "title": "Article Title",\n      "siteName": "Website Name"\n    }\n  ]\n}\n\nCONTENT GUIDELINES:\n- Base ALL information directly on the provided sources\n- Use website names for citations: [Website Name] instead of [Source X]\n- When multiple sources from same site, use: [Website Name +2] format\n- Include specific facts, dates, numbers, and quotes from the sources\n- Structure with clear sections using ### headers\n- Use **bold** for key terms and *italic* for emphasis\n- Synthesize information from multiple sources when they discuss the same topic\n- Present different viewpoints when sources conflict\n- Maintain professional, informative tone\n- Focus on the most current and relevant information from sources\n- Do NOT add external knowledge not found in the provided sources\n\nCONCLUSION GUIDELINES:\n- Avoid temptation to create summary that references all sources\n- End naturally with concluding thoughts or key takeaways\n- Keep conclusions focused and concise\n- Don't force citations into the conclusion unless naturally relevant\n\nFOLLOW-UP QUESTIONS GUIDELINES:\n- Generate 5 intelligent follow-up questions that naturally extend the topic\n- Questions should explore deeper aspects, related implications, or practical applications\n- Make questions specific and actionable based on the content discussed\n- Focus on what readers would logically want to explore next\n- Ensure questions build upon the information presented in the article\n\nCITATION REQUIREMENTS:\n- Use [Website Name] format for single sources\n- Use [Website Name +2] format when 3+ sources from same site\n- Cite specific claims, statistics, quotes, and facts\n- Include multiple citations when information comes from different sources\n- Ensure every major point is properly attributed\n- Provide full citation details in the citations array with url, title, and siteName`;
      const queryContext = research.isReverseImageSearch
        ? (research.query
            ? `Image + Text Search: The user uploaded an image and provided the query "${research.query}". We performed a reverse image search combined with their text query. Based on the search results below, provide a comprehensive analysis.`
            : `Image-Only Search: The user uploaded an image without any text query. We performed a reverse image search. Based on the search results below, provide a comprehensive analysis of what the image shows, including context, identification, and related information.`)
        : `Query: "${research.query}"`;
      const userPrompt = `${queryContext}\n\nSource Material:\n${sourceContext}\n\nTASK: Create a comprehensive, well-sourced ${research.isReverseImageSearch ? 'image analysis article' : 'article'} that ${research.isReverseImageSearch ? 'identifies and explains what the image shows' : 'directly addresses the query'} using ONLY the information provided in the sources above.\n\nRequirements:\n- Ground ALL information in the provided sources\n- Use [Website Name] citations (not [Source X]) for every major claim or fact\n- For multiple sources from same site, use [Website Name +X] format\n- Include specific details, statistics, dates, and quotes from sources\n- Structure with clear sections that organize the information logically\n- Generate 5 thoughtful follow-up questions that extend the topic naturally\n- Focus on the most current and relevant information available in the sources\n- When sources conflict, present different perspectives clearly\n- Synthesize related information from multiple sources when appropriate\n- End with natural concluding thoughts, avoid forced summary citing all sources\n\nCITATION EXAMPLES:\n- Single source: [Wikipedia]\n- Multiple from same site: [Wikipedia +2] (for 3 total sources)\n- Different sites: [Wikipedia] [Reuters] [TechCrunch]\n\nRemember: Base your response entirely on the source material provided. Do not add external information.`;
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      // Use the public model string instead of private property
      const model = research.isReverseImageSearch ? 'gpt-4o-mini' : 'gpt-4o';
      setWriterRegPayload({ model, messages });
    } catch (err) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') ? (err as any).message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Button: Writer ProPayload (Pro Search WriterAgent payload to OpenAI)
  const handleWriterProPayload = async () => {
    setLoading(true);
    setError(null);
    setWriterProPayload(null);
    try {
      // Use SwarmController to get the research data as Pro Search would
  // SwarmController is not used, remove unused variable
      // We want to get the research data and perspectives, but NOT actually call OpenAI
      // So we mimic the researchData construction in SwarmController
      const retriever = new SearchRetrieverAgent();
      const regResult = await retriever.execute('Elon Musk');
      // For pro, we can optionally generate perspectives (simulate)
      const perspectiveAgent = new PerspectiveAgent();
      let perspectives: any[] = [];
      try {
        perspectives = await perspectiveAgent.generatePerspectives('Elon Musk', true);
      } catch {}
      const research = {
        query: 'Elon Musk',
        perspectives,
        results: regResult?.data?.results || [],
        images: regResult?.data?.images || [],
        videos: regResult?.data?.videos || [],
        isReverseImageSearch: false
      };
      // Now, build the payload as WriterAgent would
  // const writerAgent = new SearchWriterAgent();
      const maxResults = 8;
      const maxContentPerResult = 600;
      const extractSiteName = (url: string): string => {
        try {
          const domain = new URL(url).hostname;
          return domain.replace('www.', '').split('.')[0];
        } catch {
          return 'Unknown Site';
        }
      };
      const sourceContext = research.results
        .slice(0, maxResults)
        .map((result: any, index: number) => {
          let content = '';
          if ('content' in result && typeof result.content === 'string') {
            content = result.content;
          } else if ('snippet' in result && typeof result.snippet === 'string') {
            content = result.snippet;
          }
          const truncatedContent = content.length > maxContentPerResult
            ? content.slice(0, maxContentPerResult) + '...'
            : content;
          const siteName = extractSiteName(result.url);
          return `Source ${index + 1} - ${siteName}:\nURL: ${result.url}\nWebsite: ${siteName}\nTitle: ${result.title}\nContent: ${truncatedContent}\n---`;
        })
        .join('\n\n');
      const systemPrompt = `You are an expert research analyst creating comprehensive, well-sourced articles with intelligent follow-up questions.\n\nCRITICAL: You must base your content ONLY on the provided sources. Do not add information not found in the sources.\n\nRESPONSE FORMAT - Return a JSON object with this exact structure:\n{\n  "content": "Your comprehensive answer here...",\n  "followUpQuestions": [\n    "Follow-up question 1",\n    "Follow-up question 2",\n    "Follow-up question 3",\n    "Follow-up question 4",\n    "Follow-up question 5"\n  ],\n  "citations": [\n    {\n      "url": "url1",\n      "title": "Article Title",\n      "siteName": "Website Name"\n    }\n  ]\n}\n\nCONTENT GUIDELINES:\n- Base ALL information directly on the provided sources\n- Use website names for citations: [Website Name] instead of [Source X]\n- When multiple sources from same site, use: [Website Name +2] format\n- Include specific facts, dates, numbers, and quotes from the sources\n- Structure with clear sections using ### headers\n- Use **bold** for key terms and *italic* for emphasis\n- Synthesize information from multiple sources when they discuss the same topic\n- Present different viewpoints when sources conflict\n- Maintain professional, informative tone\n- Focus on the most current and relevant information from sources\n- Do NOT add external knowledge not found in the provided sources\n\nCONCLUSION GUIDELINES:\n- Avoid temptation to create summary that references all sources\n- End naturally with concluding thoughts or key takeaways\n- Keep conclusions focused and concise\n- Don't force citations into the conclusion unless naturally relevant\n\nFOLLOW-UP QUESTIONS GUIDELINES:\n- Generate 5 intelligent follow-up questions that naturally extend the topic\n- Questions should explore deeper aspects, related implications, or practical applications\n- Make questions specific and actionable based on the content discussed\n- Focus on what readers would logically want to explore next\n- Ensure questions build upon the information presented in the article\n\nCITATION REQUIREMENTS:\n- Use [Website Name] format for single sources\n- Use [Website Name +2] format when 3+ sources from same site\n- Cite specific claims, statistics, quotes, and facts\n- Include multiple citations when information comes from different sources\n- Ensure every major point is properly attributed\n- Provide full citation details in the citations array with url, title, and siteName`;
      const queryContext = research.isReverseImageSearch
        ? (research.query
            ? `Image + Text Search: The user uploaded an image and provided the query "${research.query}". We performed a reverse image search combined with their text query. Based on the search results below, provide a comprehensive analysis.`
            : `Image-Only Search: The user uploaded an image without any text query. We performed a reverse image search. Based on the search results below, provide a comprehensive analysis of what the image shows, including context, identification, and related information.`)
        : `Query: "${research.query}"`;
      const userPrompt = `${queryContext}\n\nSource Material:\n${sourceContext}\n\nTASK: Create a comprehensive, well-sourced ${research.isReverseImageSearch ? 'image analysis article' : 'article'} that ${research.isReverseImageSearch ? 'identifies and explains what the image shows' : 'directly addresses the query'} using ONLY the information provided in the sources above.\n\nRequirements:\n- Ground ALL information in the provided sources\n- Use [Website Name] citations (not [Source X]) for every major claim or fact\n- For multiple sources from same site, use [Website Name +X] format\n- Include specific details, statistics, dates, and quotes from sources\n- Structure with clear sections that organize the information logically\n- Generate 5 thoughtful follow-up questions that extend the topic naturally\n- Focus on the most current and relevant information available in the sources\n- When sources conflict, present different perspectives clearly\n- Synthesize related information from multiple sources when appropriate\n- End with natural concluding thoughts, avoid forced summary citing all sources\n\nCITATION EXAMPLES:\n- Single source: [Wikipedia]\n- Multiple from same site: [Wikipedia +2] (for 3 total sources)\n- Different sites: [Wikipedia] [Reuters] [TechCrunch]\n\nRemember: Base your response entirely on the source material provided. Do not add external information.`;
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
  // Use the public model string instead of private property
  const model = 'gpt-4o';
  setWriterProPayload({ model, messages });
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };


  const handleRegularSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const retriever = new SearchRetrieverAgent();
      const regResult = await retriever.execute('Elon Musk');
      setRegularPayload(regResult?.data?.results?.[0] ? { ...regResult, data: { ...regResult.data, results: [regResult.data.results[0]] } } : regResult);
      setRegularFirstResult(regResult?.data?.results?.[0] || null);
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleProSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      // TEST: Use retriever directly (bypassing SwarmController and WriterAgent)
      // This proves the Brave search works in pro context
      console.log('🔍 [TEST] Starting Pro Search test (Retriever only)...');
      const retriever = new SearchRetrieverAgent();
      const retrieverResult = await retriever.execute('Elon Musk');
      console.log('🔍 [TEST] Retriever completed:', retrieverResult);
      
      // Format as if it came from SwarmController for consistent display
      const proResult = {
        research: {
          query: 'Elon Musk',
          perspectives: [],
          results: retrieverResult?.data?.results || []
        },
        article: {
          content: '(Pro Search - Retriever Only Test - No Writer Agent)',
          followUpQuestions: [],
          citations: []
        },
        images: retrieverResult?.data?.images || [],
        videos: retrieverResult?.data?.videos || []
      };
      
      setProPayload(proResult?.research?.results?.[0] ? { ...proResult, research: { ...proResult.research, results: [proResult.research.results[0]] } } : proResult);
      setProFirstResult(proResult?.research?.results?.[0] || null);
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
      console.error('❌ [TEST] Pro Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePerspectives = async () => {
    setLoading(true);
    setError(null);
    setPerspectives([]);
    try {
      console.log('🔍 [TEST] Generating perspectives with OpenAI...');
      const perspectiveAgent = new PerspectiveAgent();
      const generatedPerspectives = await perspectiveAgent.generatePerspectives('Elon Musk', true);
      console.log('🔍 [TEST] Perspectives generated:', generatedPerspectives);
      setPerspectives(generatedPerspectives);
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
      console.error('❌ [TEST] Perspective generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      width: '100vw',
      minHeight: '100vh',
      background: '#181c20',
      color: '#f3f3f3',
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: 16
    }}>
      {/* Left: Pro Search */}
      <div style={{
        width: '50vw',
        minWidth: 0,
        borderRight: '2px solid #23272e',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        minHeight: '100vh',
        background: '#181c20',
        color: '#f3f3f3'
      }}>
        <h2>Pro Search (Swarm)</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={handleProSearch} style={{ padding: '8px 16px', fontWeight: 600, background: '#23272e', color: '#f3f3f3', border: '1px solid #3a3f47', borderRadius: 6, cursor: 'pointer' }}>Generate Pro Payload</button>
          <button onClick={handleGeneratePerspectives} style={{ padding: '8px 16px', fontWeight: 600, background: '#2e5023', color: '#f3f3f3', border: '1px solid #4a7f3a', borderRadius: 6, cursor: 'pointer' }}>Generate Perspectives</button>
          <button onClick={handleWriterRegPayload} style={{ padding: '8px 16px', fontWeight: 600, background: '#1e3a5c', color: '#f3f3f3', border: '1px solid #2c4a6e', borderRadius: 6, cursor: 'pointer' }}>Writer RegPayload</button>
          <button onClick={handleWriterProPayload} style={{ padding: '8px 16px', fontWeight: 600, background: '#5c1e3a', color: '#f3f3f3', border: '1px solid #6e2c4a', borderRadius: 6, cursor: 'pointer' }}>Writer ProPayload</button>
        </div>
        {/* WriterAgent Payloads Section */}
        <div style={{ marginTop: 16, width: '100%' }}>
          <b>Writer RegPayload (Regular Search → OpenAI):</b>
          <pre style={{ background: '#23272e', color: '#f3f3f3', padding: 8, fontSize: 13, overflowX: 'auto', maxHeight: 320, borderRadius: 6 }}>
            {writerRegPayload ? JSON.stringify(writerRegPayload, null, 2) : 'No payload'}
          </pre>
        </div>
        <div style={{ marginTop: 16, width: '100%' }}>
          <b>Writer ProPayload (Pro Search → OpenAI):</b>
          <pre style={{ background: '#23272e', color: '#f3f3f3', padding: 8, fontSize: 13, overflowX: 'auto', maxHeight: 320, borderRadius: 6 }}>
            {writerProPayload ? JSON.stringify(writerProPayload, null, 2) : 'No payload'}
          </pre>
        </div>
        <div><b>Query:</b> Elon Musk</div>
        {/* Perspectives Section */}
        {perspectives.length > 0 && (
          <div style={{ marginTop: 16, width: '100%' }}>
            <b>AI-Generated Perspectives ({perspectives.length}):</b>
            <div style={{ background: '#23272e', color: '#f3f3f3', padding: 12, fontSize: 13, borderRadius: 6, marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
              {perspectives.map((p, idx) => (
                <div key={p.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: idx < perspectives.length - 1 ? '1px solid #3a3f47' : 'none' }}>
                  <div style={{ fontWeight: 600, color: '#6ec45c', marginBottom: 4 }}>{idx + 1}. {p.title}</div>
                  <div style={{ fontSize: 12, color: '#d0d0d0' }}>{p.content}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Source: {p.source} | Relevance: {p.relevance}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 16, width: '100%' }}>
          <b>Brave Search Payload (First Result Only):</b>
          <pre style={{ background: '#23272e', color: '#f3f3f3', padding: 8, fontSize: 13, overflowX: 'auto', maxHeight: 220, borderRadius: 6 }}>
            {proPayload ? JSON.stringify(proPayload, null, 2) : 'No payload'}
          </pre>
        </div>
        <div style={{ marginTop: 16, width: '100%' }}>
          <b>First Result:</b>
          <pre style={{ background: '#23272e', color: '#f3f3f3', padding: 8, fontSize: 14, overflowX: 'auto', maxHeight: 220, borderRadius: 6 }}>
            {proFirstResult ? JSON.stringify(proFirstResult, null, 2) : 'No result'}
          </pre>
        </div>
      </div>
      {/* Right: Regular Search */}
      <div style={{
        width: '50vw',
        minWidth: 0,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        minHeight: '100vh',
        background: '#181c20',
        color: '#f3f3f3'
      }}>
        <h2>Regular Search (Brave)</h2>
        <button onClick={handleRegularSearch} style={{ marginBottom: 16, padding: '8px 16px', fontWeight: 600, background: '#23272e', color: '#f3f3f3', border: '1px solid #3a3f47', borderRadius: 6, cursor: 'pointer' }}>Generate Regular Payload</button>
        <div><b>Query:</b> Elon Musk</div>
        <div style={{ marginTop: 16, width: '100%' }}>
          <b>Brave Search Payload (First Result Only):</b>
          <pre style={{ background: '#23272e', color: '#f3f3f3', padding: 8, fontSize: 13, overflowX: 'auto', maxHeight: 220, borderRadius: 6 }}>
            {regularPayload ? JSON.stringify(regularPayload, null, 2) : 'No payload'}
          </pre>
        </div>
        <div style={{ marginTop: 16, width: '100%' }}>
          <b>First Result:</b>
          <pre style={{ background: '#23272e', color: '#f3f3f3', padding: 8, fontSize: 14, overflowX: 'auto', maxHeight: 220, borderRadius: 6 }}>
            {regularFirstResult ? JSON.stringify(regularFirstResult, null, 2) : 'No result'}
          </pre>
        </div>
      </div>
      {/* Status/Error overlays */}
  {error && <div style={{ color: '#ff6b6b', background: '#23272e', padding: '8px 16px', borderRadius: 6, position: 'fixed', top: 10, left: '50%', zIndex: 10, fontWeight: 600 }}>Error: {error}</div>}
  {loading && <div style={{ color: '#f3f3f3', background: '#23272e', padding: '8px 16px', borderRadius: 6, position: 'fixed', top: 10, left: 10, zIndex: 10, fontWeight: 600 }}>Loading...</div>}
    </div>
  );
}
