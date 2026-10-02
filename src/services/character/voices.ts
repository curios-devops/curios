// Voice matching for characters. Catalog characters carry a hand-picked voice;
// uploaded / described characters get one picked dynamically from the vision
// pass (gender + age + vibe), so a woman never speaks with a man's voice.
// All IDs are ElevenLabs premade voices available on our account.

export type VoiceGender = 'female' | 'male' | 'neutral';
export type VoiceAge = 'child' | 'young' | 'middle_aged' | 'old';

interface VoiceOption {
  id: string;
  name: string;
  gender: VoiceGender;
  age: VoiceAge;
  vibes: string[];
}

export const VOICES: VoiceOption[] = [
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'female', age: 'young', vibes: ['playful', 'bright', 'warm', 'cute', 'fun'] },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', age: 'young', vibes: ['energetic', 'quirky', 'sassy', 'enthusiastic'] },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', age: 'young', vibes: ['professional', 'confident', 'calm', 'reassuring'] },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', age: 'middle_aged', vibes: ['velvety', 'elegant', 'confident', 'dramatic'] },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', age: 'middle_aged', vibes: ['knowledgeable', 'professional', 'upbeat'] },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'female', age: 'middle_aged', vibes: ['educator', 'clear', 'teacher', 'calm'] },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', age: 'young', vibes: ['energetic', 'social', 'confident', 'fun', 'playful'] },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'male', age: 'young', vibes: ['relaxed', 'chill', 'optimistic', 'calm'] },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'male', age: 'young', vibes: ['hyped', 'energetic', 'deep', 'sales'] },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', age: 'middle_aged', vibes: ['storyteller', 'warm', 'mature', 'calm'] },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'male', age: 'middle_aged', vibes: ['casual', 'charming', 'friendly'] },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'male', age: 'old', vibes: ['wise', 'mature', 'balanced', 'professional'] },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'neutral', age: 'middle_aged', vibes: ['neutral', 'informative', 'calm', 'robot'] },
];

const AGE_ORDER: VoiceAge[] = ['child', 'young', 'middle_aged', 'old'];

/**
 * Pick the best voice: gender must match (neutral falls back to any), then the
 * closest age, then the most vibe-word overlap. Deterministic for a given input.
 */
export function pickVoice(traits: { gender?: string; age?: string; vibe?: string }): string {
  const gender: VoiceGender = traits.gender === 'female' || traits.gender === 'male' ? traits.gender : 'neutral';
  const age: VoiceAge = (AGE_ORDER as string[]).includes(traits.age ?? '') ? (traits.age as VoiceAge) : 'young';
  const vibeWords = (traits.vibe ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean);

  const pool = gender === 'neutral' ? VOICES : VOICES.filter((v) => v.gender === gender);
  const scored = pool.map((v) => ({
    v,
    score:
      (v.gender === gender ? 10 : 0) -
      Math.abs(AGE_ORDER.indexOf(v.age) - AGE_ORDER.indexOf(age)) * 3 +
      v.vibes.filter((w) => vibeWords.includes(w)).length,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].v.id;
}
