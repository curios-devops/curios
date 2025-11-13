import { AgentResponse, SearchResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger';

export interface InsightWriterRequest {
  query: string;
  insight_areas: string[];
  search_queries: string[];
  results: SearchResult[];
  analysis_strategy: string;
  focusCategory?: string;
}

export interface InsightWriterResult {
  focus_category: string;
  style_source: string;
  headline: string;
  subtitle: string;
  short_summary: string;
  markdown_report: string;
  follow_up_questions: string[];
  citations: Array<{ text: string; source: any }>;
  confidence_level: number;
}

export class InsightWriterAgent {
  async execute(request: InsightWriterRequest): Promise<AgentResponse<InsightWriterResult>> {
    try {
      const { query, insight_areas, results, focusCategory } = request;
      
      logger.info('InsightWriterAgent: Starting insight generation', { 
        query, 
        resultsCount: results.length,
        insightAreasCount: insight_areas.length,
        focusCategory
      });

      if (!results || results.length === 0) {
        throw new Error('No search results provided for insight generation');
      }

      // Determine focus category (use provided or auto-detect)
      console.log('🎯 [TOPIC-DETECTION] Starting topic detection', {
        query,
        providedFocusCategory: focusCategory,
        willAutoDetect: !focusCategory
      });
      
      const detectedCategory = focusCategory || this.determineFocusCategory(query);
      
      console.log('🎯 [TOPIC-DETECTION] Topic determined', {
        query,
        detectedCategory,
        wasProvided: !!focusCategory,
        wasAutoDetected: !focusCategory
      });
      
      const editorialStyle = this.getEditorialStyle(detectedCategory);
      
      console.log('📰 [EDITORIAL-STYLE] Style selected', {
        category: detectedCategory,
        source: editorialStyle.source,
        tone: editorialStyle.tone
      });

      // Build dynamic system prompt based on editorial style
      const systemPrompt = `You are an experienced journalist creating insightful analysis. Write in a style inspired by ${editorialStyle.source}, but maintain your own authentic voice.

CRITICAL: Write comprehensive essays (800-1200 words) to provide deep analysis. This should be a 2-3 minute read.

JSON OUTPUT FORMAT:
{
  "focus_category": "${detectedCategory}",
  "style_source": "${editorialStyle.source}",
  "headline": "Compelling, attention-grabbing headline (8-12 words)",
  "subtitle": "Descriptive subheading that adds context (12-20 words)", 
  "short_summary": "Engaging summary that captures the essence (2-3 sentences, 60-100 words)",
  "markdown_report": "800-1200 words with **Bold Section Headers** (not markdown #). Use natural, flowing prose with detailed analysis and multiple perspectives.",
  "follow_up_questions": ["Insightful question 1", "Insightful question 2", "Insightful question 3"],
  "citations": [{"text": "Brief quote", "source": {"title": "...", "url": "...", "snippet": "..."}}],
  "confidence_level": 85
}

WRITING GUIDELINES (inspired by ${editorialStyle.source}):
Tone & Voice: ${editorialStyle.tone}
Approach: ${editorialStyle.style}

SUGGESTED STRUCTURE (adapt as needed):
${editorialStyle.structure}

Be flexible and natural - these are guidelines, not rigid rules. Write with clarity, insight, and authenticity.

FOCUS AREAS: ${insight_areas.join(', ')}

IMPORTANT: Adapt your writing style to fit the ${detectedCategory} category naturally. The focus_category MUST be "${detectedCategory}".`;

      const resultsContext = this.formatResultsForContext(results);
      
      const userPrompt = `Query: "${query}"

${resultsContext}

Write a compelling, insightful article about this topic. Draw inspiration from ${editorialStyle.source}'s approach (${editorialStyle.tone.toLowerCase()}), but write naturally and authentically. Use facts and quotes from the sources to create an engaging, informative piece.`;

      // Log payload sizes before API call
      logger.info('🔵 [INSIGHT-WRITER] Payload breakdown', {
        systemPromptChars: systemPrompt.length,
        userPromptChars: userPrompt.length,
        resultsContextChars: resultsContext.length,
        totalChars: systemPrompt.length + userPrompt.length,
        resultsCount: results.length,
        detectedCategory,
        editorialSource: editorialStyle.source
      });

      // Use Supabase Edge Function for OpenAI chat completions
      const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
        ? import.meta.env.VITE_OPENAI_API_URL
        : 'VITE_OPENAI_API_URL';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          prompt: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        })
      });
      const data = await response.json();
      const content = data.text || data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from insight writer');
      }

      let writerResult: InsightWriterResult;
      try {
        writerResult = JSON.parse(content);
      } catch (parseError) {
        logger.warn('Failed to parse writer response, using fallback', { content });
        writerResult = this.getFallbackInsights(query, results);
      }

      // Validate and enhance the result
      writerResult = this.validateWriterResult(writerResult, query, results, focusCategory);

      logger.info('InsightWriterAgent: Insight generation completed', {
        reportLength: writerResult.markdown_report.length,
        citationsCount: writerResult.citations.length,
        confidenceLevel: writerResult.confidence_level
      });

      return {
        success: true,
        data: writerResult
      };

    } catch (error) {
      logger.error('InsightWriterAgent: Insight generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });

      // Return fallback insights
      return {
        success: true,
        data: this.getFallbackInsights(request.query, request.results, request.focusCategory)
      };
    }
  }

  private formatResultsForContext(results: SearchResult[]): string {
    // Ultra-compact formatting: 10 results × 150 chars = ~1500 chars max (reduced from 200)
    return results
      .slice(0, 10)
      .map((result, index) => {
        const title = result.title.slice(0, 60); // Reduced from 80
        const content = result.content.slice(0, 150); // Reduced from 200
        return `[${index + 1}] ${title}
${content}...
`;
      })
      .join('');
  }

  private validateWriterResult(result: InsightWriterResult, query: string, results: SearchResult[], focusCategory?: string): InsightWriterResult {
    // Ensure required fields are present and valid
    const detectedCategory = result.focus_category || focusCategory || this.determineFocusCategory(query);
    const editorialStyle = this.getEditorialStyle(detectedCategory);
    
    result.focus_category = detectedCategory;
    result.style_source = result.style_source || editorialStyle.source;
    result.headline = result.headline || `Understanding ${query}`;
    result.subtitle = result.subtitle || 'What You Need to Know About This Emerging Development';
    result.short_summary = result.short_summary || `Recent developments in ${query} are reshaping the landscape. Here's what experts say about the implications and what to watch for next.`;
    
    // Ensure markdown report is substantial
    if (!result.markdown_report || result.markdown_report.length < 300) {
      result.markdown_report = this.generateStyledReport(query, results, detectedCategory);
    }

    // Ensure follow-up questions
    if (!result.follow_up_questions || result.follow_up_questions.length === 0) {
      result.follow_up_questions = [
        `What are the most significant changes happening in ${query}?`,
        `How are experts responding to these developments?`,
        `What should people watch for in the coming months?`
      ];
    }

    // Ensure citations
    if (!result.citations || result.citations.length === 0) {
      result.citations = results.slice(0, 5).map((result) => ({
        text: `${result.title} - ${result.content.slice(0, 100)}...`,
        source: {
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, 200)
        }
      }));
    }

    // Ensure confidence level
    if (!result.confidence_level || result.confidence_level < 1 || result.confidence_level > 100) {
      result.confidence_level = results.length >= 8 ? 85 : results.length >= 4 ? 70 : 60;
    }

    return result;
  }

  private determineFocusCategory(query: string): string {
    const queryLower = query.toLowerCase();
    
    console.log('🔍 [KEYWORD-MATCH] Analyzing query', { 
      originalQuery: query,
      lowerCaseQuery: queryLower,
      containsStock: queryLower.includes('stock'),
      containsEarning: queryLower.includes('earning')
    });
    
    // BUSINESS - Financial/corporate terms (check first for priority)
    if (/business|market|economy|company|corporate|finance|industry|trade|stock|earning|earnings|revenue|profit|sales|investor|investment|quarter|quarterly|fiscal|financial|merger|acquisition|ceo|executive|wall street|shares|shareholder|dividend/.test(queryLower)) {
      const match = queryLower.match(/business|market|economy|company|corporate|finance|industry|trade|stock|earning|earnings|revenue|profit|sales|investor|investment|quarter|quarterly|fiscal|financial|merger|acquisition|ceo|executive|wall street|shares|shareholder|dividend/);
      console.log('✅ [KEYWORD-MATCH] Matched BUSINESS', { matchedWord: match?.[0] });
      return 'BUSINESS';
    }
    
    // HEALTH & SPORT
    if (/health|medical|drug|disease|patient|doctor|sport|fitness|athletic|wellness|nutrition|diet|exercise|clinic|hospital|therapy/.test(queryLower)) {
      console.log('✅ [KEYWORD-MATCH] Matched HEALTH & SPORT');
      return 'HEALTH & SPORT';
    }
    
    // SCIENCES & TECH
    if (/tech|ai|software|digital|computer|cyber|science|research|study|discovery|innovation|algorithm|cloud|internet|web|app|programming/.test(queryLower)) {
      console.log('✅ [KEYWORD-MATCH] Matched SCIENCES & TECH');
      return 'SCIENCES & TECH';
    }
    
    // ARTS
    if (/art|music|film|culture|entertainment|theater|theatre|gallery|museum|creative|movie|show|concert|exhibition|fashion|design|style/.test(queryLower)) {
      console.log('✅ [KEYWORD-MATCH] Matched ARTS');
      return 'ARTS';
    }
    
    console.log('⚠️ [KEYWORD-MATCH] No match - defaulting to ANALYSIS');
    return 'ANALYSIS';
  }

  private getEditorialStyle(focusCategory: string): { source: string; tone: string; style: string; structure: string } {
    switch (focusCategory) {
      case 'BUSINESS':
        return {
          source: 'Wall Street Journal',
          tone: 'Data-driven, executive-focused, action-oriented',
          style: 'Lead with market impact and financial implications. Use precise numbers and metrics when available. Include perspectives from industry leaders. Emphasize strategic decisions and competitive dynamics. Write with authority but accessibility.',
          structure: '**Market Overview** → **Financial Impact** → **Strategic Moves** → **Competitive Landscape** → **Outlook**'
        };
      
      case 'SCIENCES & TECH':
        return {
          source: 'Wired',
          tone: 'Futuristic, accessible, wonder-filled',
          style: 'Make complex technology feel accessible and exciting. Use vivid analogies and metaphors. Connect tech developments to human impact. Balance technical detail with compelling storytelling. Write with curiosity and optimism.',
          structure: '**The Innovation** → **How It Works** → **Why It Matters** → **The Bigger Picture** → **What\'s Next**'
        };
      
      case 'ARTS':
        return {
          source: 'Vogue',
          tone: 'Elegant, sensory, emotionally resonant',
          style: 'Rich sensory details and emotional texture. Celebrate creativity and cultural significance. Use sophisticated language with natural rhythm. Focus on human stories and aesthetic experience. Write with elegance and depth.',
          structure: '**The Moment** → **The Context** → **The Vision** → **The Impact** → **The Legacy**'
        };
      
      case 'HEALTH & SPORT':
        return {
          source: 'Health Magazine',
          tone: 'Energetic, practical, empowering',
          style: 'Provide actionable advice and evidence-based insights. Share real stories of transformation when relevant. Make latest research practical and understandable. Empower readers with clear next steps. Write with energy and encouragement.',
          structure: '**The Discovery** → **The Science** → **Real-World Impact** → **Expert Advice** → **Your Next Move**'
        };
      
      default: // ANALYSIS and others
        return {
          source: 'New York Times',
          tone: 'Objective, factual, authoritative',
          style: 'Clear analytical journalism with strong reporting. Begin with a compelling lede. Use plain but sophisticated language. Balance multiple perspectives fairly. Focus on public interest and broader implications. Write with clarity and authority.',
          structure: '**Background** → **Key Findings** → **Expert Perspectives** → **Broader Impact** → **What\'s Next**'
        };
    }
  }

  private generateStyledReport(query: string, results: SearchResult[], focusCategory: string): string {
    const editorialStyle = this.getEditorialStyle(focusCategory);
    
    // Get structure sections from the style
    const structureParts = editorialStyle.structure.split(' → ').map(s => s.replace(/\*\*/g, ''));
    
    // Build intro based on editorial style
    let intro = '';
    if (focusCategory === 'BUSINESS') {
      intro = `Market dynamics in ${query} are shifting as key players respond to emerging pressures and opportunities.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Industry sources indicate significant movement in this sector.'}`;
    } else if (focusCategory === 'SCIENCES & TECH') {
      intro = `A breakthrough in ${query} signals a new chapter in how we understand and interact with this technology.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Researchers and developers are exploring innovative approaches.'}`;
    } else if (focusCategory === 'ARTS') {
      intro = `In the world of ${query}, a new creative vision is taking shape—one that speaks to our moment and points toward something larger.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Artists and cultural observers are tracing these evolving currents.'}`;
    } else if (focusCategory === 'HEALTH & SPORT') {
      intro = `New insights into ${query} are empowering people to make informed decisions about their health and performance.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Experts are translating cutting-edge research into practical guidance.'}`;
    } else {
      intro = `Recent developments in ${query} are capturing attention as experts and observers track significant changes unfolding across the sector.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Multiple sources indicate growing interest and activity in this area.'}`;
    }

    // Build sections using structure from style
    const sections = [
      intro,
      
      `**${structureParts[0] || 'Background'}**\n\nThe current situation emerged from a combination of ${focusCategory === 'BUSINESS' ? 'market forces, competitive dynamics, and strategic decisions' : focusCategory === 'SCIENCES & TECH' ? 'technological advances, research breakthroughs, and innovative thinking' : focusCategory === 'ARTS' ? 'cultural shifts, creative exploration, and evolving aesthetics' : focusCategory === 'HEALTH & SPORT' ? 'scientific discoveries, clinical evidence, and expert consensus' : 'technological advances, market shifts, and changing needs'}. ${focusCategory === 'BUSINESS' ? 'Executives and analysts' : focusCategory === 'SCIENCES & TECH' ? 'Researchers and engineers' : focusCategory === 'ARTS' ? 'Artists and curators' : focusCategory === 'HEALTH & SPORT' ? 'Health professionals and researchers' : 'Industry observers'} point to several factors driving the transformation.`,
      
      `**${structureParts[1] || 'Key Findings'}**\n\n${results.slice(0, 2).map((r) => `${focusCategory === 'BUSINESS' ? 'Market data shows' : focusCategory === 'SCIENCES & TECH' ? 'Research indicates' : focusCategory === 'ARTS' ? 'Critical analysis reveals' : focusCategory === 'HEALTH & SPORT' ? 'Studies demonstrate' : 'According to'} ${r.title}, ${r.content.slice(0, 150)}...`).join('\n\n')}`,
      
      `**${structureParts[2] || 'Expert Perspectives'}**\n\n${focusCategory === 'BUSINESS' ? 'Industry leaders and financial analysts' : focusCategory === 'SCIENCES & TECH' ? 'Leading researchers and technologists' : focusCategory === 'ARTS' ? 'Critics and cultural observers' : focusCategory === 'HEALTH & SPORT' ? 'Medical experts and wellness professionals' : 'Industry observers'} note that these developments reflect broader trends. "${focusCategory === 'BUSINESS' ? 'The strategic implications are significant' : focusCategory === 'SCIENCES & TECH' ? 'The technological potential is remarkable' : focusCategory === 'ARTS' ? 'The cultural resonance is profound' : focusCategory === 'HEALTH & SPORT' ? 'The health benefits are compelling' : 'The implications extend beyond immediate participants'}," according to recent analysis.`,
      
      `**${structureParts[3] || 'Impact'}**\n\nThe changes are prompting ${focusCategory === 'BUSINESS' ? 'organizations to reassess strategies and market positioning' : focusCategory === 'SCIENCES & TECH' ? 'institutions to rethink approaches and capabilities' : focusCategory === 'ARTS' ? 'the cultural landscape to evolve in unexpected ways' : focusCategory === 'HEALTH & SPORT' ? 'individuals to reconsider their health and fitness approaches' : 'stakeholders to adjust their approaches'}. ${focusCategory === 'BUSINESS' ? 'Early movers are gaining competitive advantage' : focusCategory === 'SCIENCES & TECH' ? 'Early adopters are exploring new possibilities' : focusCategory === 'ARTS' ? 'Forward-thinking creators are leading the way' : focusCategory === 'HEALTH & SPORT' ? 'Informed individuals are seeing tangible results' : 'Early adopters are already adjusting'}, while others monitor developments closely.`,
      
      `**${structureParts[4] || 'Next Steps'}**\n\n${focusCategory === 'BUSINESS' ? 'Market watchers' : focusCategory === 'SCIENCES & TECH' ? 'Technology observers' : focusCategory === 'ARTS' ? 'Cultural commentators' : focusCategory === 'HEALTH & SPORT' ? 'Health experts' : 'Experts'} recommend ${focusCategory === 'BUSINESS' ? 'tracking quarterly results, competitive moves, and regulatory developments' : focusCategory === 'SCIENCES & TECH' ? 'watching for research publications, product launches, and adoption trends' : focusCategory === 'ARTS' ? 'following exhibitions, critical reception, and cultural dialogue' : focusCategory === 'HEALTH & SPORT' ? 'monitoring new studies, expert recommendations, and real-world outcomes' : 'watching for continued evolution in the coming months'}. Key indicators include ${focusCategory === 'BUSINESS' ? 'market share, revenue growth, and strategic partnerships' : focusCategory === 'SCIENCES & TECH' ? 'adoption rates, capability improvements, and ecosystem development' : focusCategory === 'ARTS' ? 'critical acclaim, audience engagement, and cultural influence' : focusCategory === 'HEALTH & SPORT' ? 'evidence strength, expert consensus, and practical application' : 'adoption rates, stakeholder responses, and competitive positioning'}.`
    ];

    return sections.join('\n\n');
  }

  private getFallbackInsights(query: string, results: SearchResult[], focusCategory?: string): InsightWriterResult {
    const detectedCategory = focusCategory || this.determineFocusCategory(query);
    const editorialStyle = this.getEditorialStyle(detectedCategory);
    
    return {
      focus_category: detectedCategory,
      style_source: editorialStyle.source,
      headline: `Understanding ${query}`,
      subtitle: 'A Look at Recent Developments and What They Mean',
      short_summary: `Analysis of ${query} reveals emerging trends and significant changes. Experts are monitoring the situation as developments unfold and implications become clearer.`,
      markdown_report: this.generateStyledReport(query, results, detectedCategory),
      follow_up_questions: [
        `What are the key factors driving changes in ${query}?`,
        `How are industry leaders responding to these developments?`,
        `What should observers watch for in the near future?`
      ],
      citations: results.slice(0, 5).map((result) => ({
        text: result.title.slice(0, 50),
        source: {
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, 100)
        }
      })),
      confidence_level: results.length >= 6 ? 75 : 65
    };
  }
}