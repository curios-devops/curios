// Half-body cast (Anam stock avatars). Anam renders a talking upper body and
// speaks exactly the text we stream to it — no director, no actions. Each
// avatar gets an ElevenLabs voice (multilingual) of the matching gender.

const IMG = 'https://newgxnc1uqs0jnqm.public.blob.vercel-storage.com/avatars/stock';

export interface HalfBodyPreset {
  id: string;
  name: string;
  tagline: string;
  imageUrl: string;
  anamAvatarId: string;
  anamVoiceId: string;
  gender: 'female' | 'male';
  tags: string[];
}

// Anam voices (ElevenLabs-backed) by gender.
const VOICE = {
  jessica: '58430801-bfd6-5474-86bc-4e9e2139425e', // F, US — playful, bright, warm
  miaMoore: 'c4b38290-af46-5065-9f9c-db481ee04c5e', // F, GB — studio presenter
  lucy: 'de23e340-1416-4dd8-977d-065a7ca11697', // F, GB — fresh & casual
  blondie: 'a73ada90-a9c9-5e10-92a0-0c637ae744e7', // F, GB — relaxed
  archer: '3cdb3dc6-1946-5042-adf3-993ba638d582', // M, GB
  dani: '2d96e0ff-6667-4d7d-a908-f5e4d6ee0bcd', // M, ES — confident, natural
  martin: '12ecaa5e-cf87-5aad-b25b-8588b8490bc7', // M — round and polished
  marcel: '793e8179-19b1-41a5-87a8-69b258c87138', // M — warm, conversational
};

export const HALF_BODY: HalfBodyPreset[] = [
  { id: 'mia-studio', name: 'Mia', tagline: 'Studio host', imageUrl: `${IMG}/mia_studio.webp`, anamAvatarId: 'edf6fdcb-acab-44b8-b974-ded72665ee26', anamVoiceId: VOICE.miaMoore, gender: 'female', tags: ['news', 'host', 'woman'] },
  { id: 'liv', name: 'Liv', tagline: 'Friendly guide', imageUrl: `${IMG}/liv_home.webp`, anamAvatarId: '071b0286-4cce-4808-bee2-e642f1062de3', anamVoiceId: VOICE.jessica, gender: 'female', tags: ['friendly', 'home', 'woman'] },
  { id: 'gabriel', name: 'Gabriel', tagline: 'Business advisor', imageUrl: `${IMG}/gabriel_table.webp`, anamAvatarId: '6cc28442-cccd-42a8-b6e4-24b7210a09c5', anamVoiceId: VOICE.archer, gender: 'male', tags: ['business', 'finance', 'man'] },
  { id: 'finn', name: 'Finn', tagline: 'Tech explainer', imageUrl: `${IMG}/finn_lean.webp`, anamAvatarId: '8a339c9f-0666-46bd-ab27-e90acd0409dc', anamVoiceId: VOICE.dani, gender: 'male', tags: ['tech', 'science', 'man'] },
  { id: 'sophie', name: 'Sophie', tagline: 'Lifestyle & culture', imageUrl: `${IMG}/sophie_sofa.webp`, anamAvatarId: '6dbc1e47-7768-403e-878a-94d7fcc3677b', anamVoiceId: VOICE.lucy, gender: 'female', tags: ['lifestyle', 'culture', 'woman'] },
  { id: 'richard', name: 'Richard', tagline: 'History & ideas', imageUrl: `${IMG}/richard_table.webp`, anamAvatarId: '19d18eb0-5346-4d50-a77f-26b3723ed79d', anamVoiceId: VOICE.martin, gender: 'male', tags: ['history', 'philosophy', 'man'] },
  { id: 'astrid', name: 'Astrid', tagline: 'Health & science', imageUrl: `${IMG}/astrid_desk.webp`, anamAvatarId: 'bdaaedfa-00f2-417a-8239-8bb89adec682', anamVoiceId: VOICE.blondie, gender: 'female', tags: ['health', 'science', 'woman'] },
  { id: 'leo-desk', name: 'Leo', tagline: 'Everyday answers', imageUrl: `${IMG}/leo_desk.1.webp`, anamAvatarId: 'aa5d6abd-416f-4dd4-a123-b5b29bf1644a', anamVoiceId: VOICE.marcel, gender: 'male', tags: ['general', 'man'] },
];

export const DEFAULT_HALF_BODY_ID = 'mia-studio';

export function findHalfBody(id: string | null | undefined): HalfBodyPreset {
  return HALF_BODY.find((p) => p.id === id) ?? HALF_BODY.find((p) => p.id === DEFAULT_HALF_BODY_ID)!;
}
