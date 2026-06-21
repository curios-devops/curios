// Image Generation Service for Insights Articles
// Uses OpenAI gpt-image-2 (same model as Movie) via the fetch-openai edge function.
// Quality lever: 'low' (free/standard) | 'medium' (HD / Pro).

// Focus category type from our insights system
type FocusCategory = 'ANALYSIS' | 'ARTS' | 'BUSINESS' | 'HEALTH & SPORT' | 'SCIENCES & TECH';

interface ImagePromptOptions {
  articleTitle?: string;
  articleSummary: string;
  focusCategory?: FocusCategory;
  tone?: string; // optional manual override
}

interface GeneratedImageResult {
  url: string;
  revisedPrompt?: string;
}

/**
 * Basic heuristic tone detector.
 * Looks for common keywords to infer mood / intent.
 */
function detectToneFromText(text: string): string {
  const lower = text.toLowerCase();

  if (/(future|ai|technology|innovation|transformation)/.test(lower))
    return 'futuristic';
  if (/(challenge|risk|concern|problem|crisis|decline)/.test(lower))
    return 'critical';
  if (/(growth|success|hope|inspiration|improvement|progress)/.test(lower))
    return 'optimistic';
  if (/(analysis|report|study|research|data|insight)/.test(lower))
    return 'analytical';
  if (/(community|human|connection|team|people|culture)/.test(lower))
    return 'human-centric';
  
  return 'neutral';
}

/**
 * Get style guidance based on focus category
 */
function getStyleForFocusCategory(category?: FocusCategory): string {
  switch (category) {
    case 'ARTS':
      return 'Use a creative, artistic illustration style with vibrant colors and expressive composition.';
    case 'BUSINESS':
      return 'Use a professional, corporate visual style with clean lines and authoritative aesthetics.';
    case 'HEALTH & SPORT':
      return 'Use an energetic, health-focused visual style with dynamic composition and active imagery.';
    case 'SCIENCES & TECH':
      return 'Use a technical, modern visual style with innovative and cutting-edge aesthetics.';
    case 'ANALYSIS':
    default:
      return 'Use a clean, modern, editorial illustration style suitable for an online insight article.';
  }
}

/**
 * Builds a GPT Image 1 prompt that matches an article's content, tone, and focus category.
 */
export function buildImagePrompt({
  articleTitle,
  articleSummary,
  focusCategory,
  tone,
}: ImagePromptOptions): string {
  const titleOrSummary = articleTitle?.trim() || articleSummary.trim();

  // Auto-detect tone if not provided
  const finalTone = tone || detectToneFromText(articleSummary);
  const tonePhrase = finalTone ? `with a ${finalTone} tone` : '';

  // Get style based on focus category
  const styleGuidance = getStyleForFocusCategory(focusCategory);

  const prompt = `
Create a single, visually engaging image that represents the main idea of this article: 
${titleOrSummary}. 
Focus on expressing the core theme ${tonePhrase}. 
${styleGuidance}
Avoid text, logos, or brand elements. 
Balanced composition, soft lighting, and visually clear storytelling.
  `.trim();

  // Keep prompt concise to optimize GPT Image 1 latency
  return prompt.slice(0, 750);
}

/**
 * Generate an image using OpenAI's image generation API via Supabase Edge Function
 */
export async function generateArticleImage(
  options: ImagePromptOptions & { quality?: 'low' | 'medium' | 'high' }
): Promise<GeneratedImageResult> {
  try {
    const prompt = buildImagePrompt(options);
    const quality = options.quality || 'low'; // 'low' = free/standard, 'medium' = HD/Pro
    const model = import.meta.env.VITE_MOVIE_IMAGE_MODEL || 'gpt-image-2';

    const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseEdgeUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing (VITE_OPENAI_API_URL or VITE_SUPABASE_ANON_KEY)');
    }

    // gpt-image-2 (same model Movie uses). Returns base64 → the edge function hands
    // back a data URL when no storageBucket is requested, which the hero <img> renders.
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        imageGeneration: true,
        prompt,
        model,
        size: '1024x1536', // portrait hero
        quality,
        n: 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image generation failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.url || data.data?.[0]?.url || data.image_url;
    const revisedPrompt = data.revised_prompt || data.data?.[0]?.revised_prompt;

    if (!imageUrl) {
      throw new Error('No image URL returned from API');
    }

    return {
      url: imageUrl,
      revisedPrompt: revisedPrompt
    };
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to generate image: ${error.message}`
        : 'Failed to generate image'
    );
  }
}

/**
 * Helper function to extract article summary from markdown content
 * Takes first 300 characters of the article for summary
 */
export function extractArticleSummary(markdownContent: string): string {
  // Remove markdown formatting
  const plainText = markdownContent
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Take first 300 chars
  return plainText.slice(0, 300);
}
