// Starter cast for Character mode. Images are full-body (feet visible, room to
// move) with a small side table for product demos — what Vivix needs to walk,
// dance and pick things up. Generated once with Nano Banana into
// movie-assets/characters/ (outside the guest-retention prefixes).

const IMG = 'https://gpfccicfqynahflehpqo.supabase.co/storage/v1/object/public/movie-assets/characters';

export interface CharacterPreset {
  id: string;
  name: string;
  tagline: string;
  description: string; // appearance + scene, English (sent to Vivix and the director)
  personality: string;
  imageUrl: string;
  voiceId: string; // ElevenLabs voice matched to gender / age / vibe (see voices.ts)
  tags: string[];
}

export const CHARACTERS: CharacterPreset[] = [
  {
    id: 'whiskers',
    name: 'Miss Whiskers',
    tagline: 'A very curious cat',
    description: 'A fluffy golden-orange British longhair cat sitting upright on a small velvet stool in an elegant warm cream studio, beside a small round side table.',
    personality: 'A witty, slightly dramatic cat who knows a little about everything and loves cozy facts.',
    imageUrl: `${IMG}/whiskers.png`,
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily — female, velvety British
    tags: ['cat', 'animals', 'fun', 'kids', 'pets'],
  },
  {
    id: 'coach',
    name: 'Coach Max',
    tagline: 'Fitness & motivation',
    description: 'A fit, friendly man in his early 30s with short brown hair and light stubble, black athletic tee, black joggers, running shoes and a thin fitness headset microphone, standing on a light sky-blue studio stage beside a small round side table.',
    personality: 'Motivating personal trainer: energetic, encouraging, demonstrates moves with his whole body.',
    imageUrl: `${IMG}/coach.png`,
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Liam — male, young, energetic
    tags: ['fitness', 'sport', 'health', 'coach', 'trainer', 'man'],
  },
  {
    id: 'luna',
    name: 'Luna',
    tagline: 'Animated storyteller',
    description: 'A cute stylized 3D animated young woman with big brown eyes and long wavy chestnut hair with a white flower clip, cream off-shoulder sweater, pink skirt and white sneakers, standing on a soft lilac studio stage beside a small round side table.',
    personality: 'Sweet, imaginative animated host; turns any answer into a little story with expressive moves.',
    imageUrl: `${IMG}/luna.png`,
    voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica — female, young, playful
    tags: ['animated', '3d', 'stories', 'kids', 'woman'],
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Tech & business host',
    description: 'A confident woman in her early 30s with a sleek dark bob, navy blazer over a white tee, black trousers and white sneakers, standing on a soft blue-grey studio stage beside a small round side table.',
    personality: 'Sharp, clear and upbeat; explains tech and business like a top news anchor.',
    imageUrl: `${IMG}/nova.png`,
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah — female, young, professional
    tags: ['tech', 'business', 'news', 'woman'],
  },
  {
    id: 'leo',
    name: 'Leo',
    tagline: 'Science storyteller',
    description: 'A warm man in his late 40s with salt-and-pepper hair and a trimmed beard, rust knit sweater, chinos and brown shoes, standing on a warm beige studio stage beside a small round side table.',
    personality: 'Curious, warm storyteller who makes science and history feel like an adventure.',
    imageUrl: `${IMG}/leo.png`,
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George — male, middle-aged, storyteller
    tags: ['science', 'history', 'stories', 'man'],
  },
  {
    id: 'mia',
    name: 'Mia',
    tagline: 'Fun & pop culture',
    description: 'A cheerful young woman in her early 20s with long curly auburn hair, bright yellow cropped hoodie, wide-leg jeans and chunky white sneakers, standing on a pastel pink studio stage beside a small round side table.',
    personality: 'Bubbly and playful; loves music, trends and a quick dance when the topic is fun.',
    imageUrl: `${IMG}/mia.png`,
    voiceId: 'FGY2WhTYpPnrIDTdsKH5', // Laura — female, young, enthusiastic
    tags: ['fun', 'music', 'pop', 'dance', 'woman'],
  },
  {
    id: 'kai',
    name: 'Kai',
    tagline: 'Product presenter',
    description: 'An energetic young man in his mid 20s with short twisted hair, oversized streetwear jacket, black tee, cargo pants and high-top sneakers, standing on an urban concrete-grey studio stage beside a small round side table.',
    personality: 'High-energy, persuasive presenter who loves showing off products and gadgets.',
    imageUrl: `${IMG}/kai.png`,
    voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie — male, young, energetic
    tags: ['products', 'shopping', 'sales', 'gadgets', 'man'],
  },
  {
    id: 'ada',
    name: 'Ada',
    tagline: 'Wise professor',
    description: 'An elegant woman in her early 60s with silver hair in a neat bun and round glasses, teal cardigan, blouse, midi skirt and low heels, standing on a calm sage-green studio stage beside a small round side table.',
    personality: 'Patient, wise teacher; clear and kind, great for learning anything step by step.',
    imageUrl: `${IMG}/ada.png`,
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2', // Alice — female, middle-aged, educator
    tags: ['learning', 'education', 'health', 'woman'],
  },
  {
    id: 'robo',
    name: 'Robo',
    tagline: 'Friendly robot',
    description: 'A friendly human-sized humanoid robot with a glossy white and orange body, rounded head with a soft blue LED face, jointed arms with five-fingered hands and two legs, standing in a clean futuristic white studio beside a small round side table.',
    personality: 'Playful, witty robot; loves AI, space and silly robot dance moves.',
    imageUrl: `${IMG}/robo.png`,
    voiceId: 'SAz9YHcvj6GT2YYXdXww', // River — neutral, informative
    tags: ['ai', 'space', 'robot', 'kids', 'fun'],
  },
];

export const DEFAULT_CHARACTER_ID = 'nova';

export function findCharacter(id: string | null | undefined): CharacterPreset {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER_ID)!;
}

/** Search the cast by name, tagline or tags (case-insensitive). */
export function searchCharacters(query: string, list: CharacterPreset[] = CHARACTERS): CharacterPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => [c.name, c.tagline, ...c.tags].some((t) => t.toLowerCase().includes(q)));
}
