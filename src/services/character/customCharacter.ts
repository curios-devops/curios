// Build a character from the user's own photo or a text description. A vision
// pass describes the image (Vivix needs a scene description) and its gender /
// age / vibe pick a matching voice.

import { supabase } from '../../lib/supabase';
import { uploadImageToStorage } from '../../utils/imageUpload';
import { describeCharacterImage } from './characterSession';
import { pickVoice } from './voices';
import type { CharacterPreset } from './characterCatalog';

const STAGE =
  'Photorealistic vertical 9:16 photo, full body head to toe with feet visible, standing centered facing the camera with relaxed arms and empty hands, generous empty space on both sides, eye-level camera. Beside them on their right stands a small empty round side table within reach. Clean, softly lit studio stage with a seamless backdrop. No text, no logos.';

async function presetFromImage(imageUrl: string, name: string): Promise<CharacterPreset> {
  const traits = await describeCharacterImage(imageUrl);
  return {
    id: `custom-${Date.now()}`,
    name,
    tagline: 'Your character',
    description: traits.description,
    personality: `${traits.vibe}, friendly presenter`,
    imageUrl,
    voiceId: pickVoice(traits),
    tags: ['custom'],
  };
}

/** Upload a photo and turn it into a character. */
export async function characterFromPhoto(file: File): Promise<CharacterPreset> {
  const url = await uploadImageToStorage(file);
  return presetFromImage(url, 'My character');
}

/** Generate a full-body character image from a description, then describe it. */
export async function characterFromDescription(text: string): Promise<CharacterPreset> {
  const { data, error } = await supabase.functions.invoke('gemini-image', {
    body: {
      prompt: `${text.trim()}. ${STAGE}`,
      aspectRatio: '9:16',
      storageBucket: 'movie-assets',
      storagePath: `characters/custom/${crypto.randomUUID()}.png`,
    },
  });
  if (error || !data?.url) throw new Error(data?.error || error?.message || 'Could not create the character image');
  return presetFromImage(data.url as string, text.trim().split(/\s+/).slice(0, 3).join(' '));
}
