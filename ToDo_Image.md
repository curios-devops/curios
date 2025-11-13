let's implement a new drawing image function, for this;
1.  behind the image and aligned righ (but still behind th image in the image area ), draw a PRO badge Accent responsive and just right a  litle buton with a tooltip "Create image"  similar to icon provided in the attached image  when user press the button put a semi transparent waiting ring or any indicator of sistem is  working and include a text like generating image for your article ... that coul take some seconds...  
2. add the functionallity you should use the generate image from openai, here is the code sample from oficail openaiwebsite:

Generate an image

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
});

Generate a portrait  image
import OpenAI from "openai";
import fs from "fs";
const openai = new OpenAI();

const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: "Draw a 2D pixel art style sprite sheet of a tabby gray cat",
    size: "1024x1536",
    quality: "low",
});
3. you ned to autogenrate the prompt for the image. for this you can base in this sample code (including our topic to make diferents style, arts can be more images, and so on for our 5 topics:
type ImagePromptOptions = {
  articleTitle?: string;
  articleSummary: string;
  tone?: string; // optional manual override
};

/**
 * Basic heuristic tone detector.
 * Looks for common keywords to infer mood / intent.
 */
function detectToneFromText(text: string): string {
  const lower = text.toLowerCase();

  if (/(future|ai|technology|innovation|transformation)/.test(lower))
    return "futuristic";
  if (/(challenge|risk|concern|problem|crisis|decline)/.test(lower))
    return "critical";
  if (/(growth|success|hope|inspiration|improvement|progress)/.test(lower))
    return "optimistic";
  if (/(analysis|report|study|research|data|insight)/.test(lower))
    return "analytical";
  if (/(community|human|connection|team|people|culture)/.test(lower))
    return "human-centric";
  
  return "neutral";
}

/**
 * Builds a GPT Image 1 prompt that matches an article’s content and tone.
 */
export function buildImagePrompt({
  articleTitle,
  articleSummary,
  tone,
}: ImagePromptOptions): string {
  const titleOrSummary = articleTitle?.trim() || articleSummary.trim();

  // Auto-detect tone if not provided
  const finalTone = tone || detectToneFromText(articleSummary);
  const tonePhrase = finalTone ? `with a ${finalTone} tone` : "";

  const prompt = `
Create a single, visually engaging image that represents the main idea of this article: 
${titleOrSummary}. 
Focus on expressing the core theme ${tonePhrase}. 
Use a clean, modern, editorial illustration style suitable for an online insight article. 
Avoid text, logos, or brand elements. 
Balanced composition, soft lighting, and visually clear storytelling.
  `.trim();

  // Keep prompt concise to optimize GPT Image 1 latency
  return prompt.slice(0, 750);
}
Example Usage
const prompt = buildImagePrompt({
  articleTitle: "AI is transforming education",
  articleSummary:
    "Artificial intelligence is reshaping how students learn by personalizing their education experience.",
});

console.log(prompt);


Output Example:

Create a single, visually engaging image that represents the main idea of this article: 
AI is transforming education. 
Focus on expressing the core theme with a futuristic tone. 
Use a clean, modern, editorial illustration style suitable for an online insight article. 
Avoid text, logos, or brand elements. 
Balanced composition, soft lighting, and visually clear storytelling.

⚙️ Notes

🔍 The tone detector is deliberately lightweight — fast enough for runtime use.

🧠 You can easily expand the keyword lists to reflect your brand or content style.

⏱ Prompts stay under 750 chars for minimal GPT Image 1 latency.

🧩 Works nicely with any article/insight pipeline — just feed in your AI-generated text.