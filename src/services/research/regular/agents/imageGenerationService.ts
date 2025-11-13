// Image Generation Service for Insights Articles
// Uses OpenAI's DALL-E API via Supabase Edge Function to generate custom images

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
  options: ImagePromptOptions
): Promise<GeneratedImageResult> {
  console.log('🎨 [Service] generateArticleImage called with options:', options);
  
  try {
    // Build the prompt
    const prompt = buildImagePrompt(options);
    console.log('� [Service] Built prompt:', prompt);
    console.log('📏 [Service] Prompt length:', prompt.length);

    // Use Supabase Edge Function for OpenAI API calls (same as insightWriterAgent)
    const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔧 [Service] Using Supabase Edge Function');
    console.log('🌐 [Service] Edge URL present:', !!supabaseEdgeUrl);
    console.log('� [Service] Anon Key present:', !!supabaseAnonKey);

    if (!supabaseEdgeUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing (VITE_OPENAI_API_URL or VITE_SUPABASE_ANON_KEY)');
    }

    // Try gpt-image-1 first, fallback to dall-e-3 if it fails
    console.log('🚀 [Service] Trying gpt-image-1 first...');
    
    let response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        imageGeneration: true,
        prompt: prompt,
        model: 'gpt-image-1',
        size: '1024x1536', // Portrait for gpt-image-1
        quality: 'low',
        n: 1
      })
    });

    console.log('📊 [Service] gpt-image-1 response status:', response.status);
    
    // If gpt-image-1 fails (403 = org not verified, etc), fallback to dall-e-3
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('⚠️ [Service] gpt-image-1 failed, falling back to dall-e-3:', errorText);
      
      console.log('🔄 [Service] Retrying with dall-e-3...');
      response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          imageGeneration: true,
          prompt: prompt,
          model: 'dall-e-3',
          size: '1024x1792', // Portrait for dall-e-3
          quality: 'standard',
          n: 1
        })
      });
      
      console.log('📊 [Service] dall-e-3 response status:', response.status);
      
      if (!response.ok) {
        const fallbackError = await response.text();
        console.error('❌ [Service] Both models failed. dall-e-3 error:', fallbackError);
        throw new Error(`Image generation failed with both models: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('✅ [Service] Response data:', data);

    // Handle different response formats
    const imageUrl = data.url || data.data?.[0]?.url || data.image_url;
    const revisedPrompt = data.revised_prompt || data.data?.[0]?.revised_prompt;

    if (!imageUrl) {
      console.error('❌ [Service] No image URL in response:', data);
      throw new Error('No image URL returned from API');
    }
    
    console.log('✅ [Service] Image generated successfully:', imageUrl);

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
