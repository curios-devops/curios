export interface ArtifactCategory {
  id: string;
  name: string;
  icon: string;
  types: ArtifactType[];
  description: string;
}

export interface ArtifactType {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface Artifact {
  id: string;
  title: string;
  description: string;
  type: string;
  category: 'docs' | 'images' | 'games' | 'data' | 'webs';
  content: string;
  createdAt: Date;
  imageUrl?: string;
  gameCode?: string;
}

export interface ArtifactGenerationRequest {
  prompt: string;
  category: 'docs' | 'images' | 'games' | 'data' | 'webs';
  type?: string;
}

export const ARTIFACT_CATEGORIES: ArtifactCategory[] = [
  {
    id: 'docs',
    name: 'Docs / PDFs / PowerPoints',
    icon: '📄',
    types: [
      { id: 'doc', name: 'Document', description: 'Formatted text documents with rich content' },
      { id: 'slides', name: 'Slides', description: 'Presentation slides with visual layouts' },
      { id: 'pdf', name: 'PDF', description: 'Professional document layouts' }
    ],
    description: 'Documents, presentations, and formatted content'
  },
  {
    id: 'images',
    name: 'Images / Visual Tools',
    icon: '🖼️',
    types: [
      { id: 'diagram', name: 'Diagram', description: 'Technical diagrams and flowcharts' },
      { id: 'sketch', name: 'Sketch', description: 'Hand-drawn style illustrations' },
      { id: 'photo', name: 'Photo', description: 'Realistic image compositions' }
    ],
    description: 'Visual content, graphics, and design tools'
  },
  {
    id: 'games',
    name: 'Mini-games / Interactive',
    icon: '🧩',
    types: [
      { id: 'puzzles', name: 'Puzzles', description: 'Mind-bending puzzle games' },
      { id: 'rpg', name: 'RPG', description: 'Role-playing game experiences' },
      { id: 'flashcards', name: 'Flashcards', description: 'Interactive learning cards' },
      { id: 'arcade', name: 'Arcade', description: 'Classic arcade-style games' },
      { id: 'retro', name: 'Retro', description: 'Nostalgic retro games' }
    ],
    description: 'Simple games and interactive experiences'
  },
  {
    id: 'data',
    name: 'Data / Tables / Visualizations',
    icon: '📊',
    types: [
      { id: 'table', name: 'Table', description: 'Sortable and filterable data tables' },
      { id: 'graph', name: 'Graph', description: 'Charts and statistical visualizations' },
      { id: 'diagram', name: 'Diagram', description: 'Data flow and process diagrams' }
    ],
    description: 'Data visualization and analysis tools'
  },
  {
    id: 'webs',
    name: 'Web Apps / Landing Pages',
    icon: '🌐',
    types: [
      { id: 'spa', name: 'Single Page App', description: 'Interactive web applications' },
      { id: 'landing', name: 'Landing Page', description: 'Marketing and promotional pages' },
      { id: 'personal', name: 'Personal Page', description: 'Portfolio and profile pages' }
    ],
    description: 'Complete web applications and pages'
  }
];
