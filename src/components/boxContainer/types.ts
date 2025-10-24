export type FocusMode = 'focus' | 'web' | 'social' | 'video' | 'math' | 'travel' | 'health' | 'academic' | 'finance';

export interface SearchType {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  badge?: string;
}

export const searchTypes: SearchType[] = [
  {
    id: 'auto',
    name: 'Auto',
    description: 'Adapts to each query',
    icon: Brain,
    enabled: true
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '3x more sources and detailed answers',
    icon: Sparkles,
    enabled: true,
    badge: 'PRO'
  },
  {
    id: 'deepResearch',
    name: 'Deep Research',
    description: 'In-depth reports on complex topics',
    icon: Microscope,
    enabled: true,
    badge: 'PRO'
  }
];