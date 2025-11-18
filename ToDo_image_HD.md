To do: 

1. There  is a 403 error calling openai, that mean I guess a problem with the key or format used to make the call. here is the console log from buton image pressed until 403 error for your refeence: "Image Generation] Button clicked
TabSystem.tsx:148 📊 [Image Generation] Starting generation with data: 
{headline: 'Metropolitan Museum’s Renaissance: Art, Innovation, and Audiences Reimagined', focus: 'ARTS', hasMarkdown: true}
TabSystem.tsx:156 ⏳ [Image Generation] Loading state set to true
TabSystem.tsx:159 📝 [Image Generation] Extracted summary: The Moment: A Cultural Reawakening In 2025, The Metropolitan Museum of Art celebrated a thrilling mi...
TabSystem.tsx:161 🚀 [Image Generation] Calling generateArticleImage...
imageGenerationService.ts:96 🎨 [Service] generateArticleImage called with options: 
{articleTitle: 'Metropolitan Museum’s Renaissance: Art, Innovation, and Audiences Reimagined', articleSummary: 'The Moment: A Cultural Reawakening In 2025, The Me… embodies a powerful cultural pulse, a collective', focusCategory: 'ARTS'}
imageGenerationService.ts:101 � [Service] Built prompt: Create a single, visually engaging image that represents the main idea of this article: 
Metropolitan Museum’s Renaissance: Art, Innovation, and Audiences Reimagined. 
Focus on expressing the core theme with a neutral tone. 
Use a creative, artistic illustration style with vibrant colors and expressive composition.
Avoid text, logos, or brand elements. 
Balanced composition, soft lighting, and visually clear storytelling.
imageGenerationService.ts:102 📏 [Service] Prompt length: 425
imageGenerationService.ts:108 🔧 [Service] Using Supabase Edge Function
imageGenerationService.ts:109 🌐 [Service] Edge URL present: true
imageGenerationService.ts:110 � [Service] Anon Key present: true
imageGenerationService.ts:117 🚀 [Service] Calling Supabase Edge Function...
imageGenerationService.ts:118 
 POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai 403 (Forbidden)
generateArticleImage	@	imageGenerationService.ts:118
handleGenerateImage	@	TabSystem.tsx:162
". Double check the format should match the example from oficial openaidocumentation here : "Generate an image
import OpenAI from "openai";
import fs from "fs";
const openai = new OpenAI();

const prompt = `
A children's book drawing of a veterinarian using a stethoscope to 
listen to the heartbeat of a baby otter.
`;

const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
});", aslo read and match how agent writer make call to open ai via supabase specifially the supabase edge function.  

2. retrofit the buton for calling image now we have a button a text and a togle, you need to retrofit for consistency and copy (just read do not touch) the three button selector used in home page input contatiner for search and serach pro , so the behavoir for our button in results page (only work in our insights workflow ) should be the next : button add a tool tip thta say someting like "Generate image with AI" , on hoover open a similar modal like the one in the search workflow (do not touch jus read) with the same and logic structure:
For guess users this is the structure:
Title: AI Image
explanation: Generate Image with AI
div line : -------------------
PRO badge Set Pro for HD image (in accent responsve color) Togle button 
explanation: Get sharper visuals, rendered in full HD quality.
buton Sign In for Access 
do simialr for signed user follow the pattern used in search workflow for signed user (free and paid tiers) (in our insights flow, again be very carefull do not touch any other logic or workflow  ).
