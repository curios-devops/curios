import { supabase } from '../../../../lib/supabase';

export interface SelectableAvatar {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'unspecified';
  description?: string;
  imageUrl?: string;
}

interface ListAvatarsResponse {
  avatars: SelectableAvatar[];
}

const FALLBACK_AVATARS: SelectableAvatar[] = [
  { id: '071b0286-4cce-4808-bee2-e642f1062de3', name: 'Liv', gender: 'female', description: 'Female avatar · default style' },
];

export async function listAnamAvatars(): Promise<SelectableAvatar[]> {
  try {
    const { data, error } = await supabase.functions.invoke<ListAvatarsResponse>('list-anam-avatars', {
      method: 'GET',
    });

    if (error) {
      return FALLBACK_AVATARS;
    }

    if (!data?.avatars?.length) {
      return FALLBACK_AVATARS;
    }

    return data.avatars.slice(0, 5);
  } catch {
    return FALLBACK_AVATARS;
  }
}
