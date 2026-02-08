/**
 * Progressive Player Component
 * TODO: Actualizar para usar el nuevo sistema de chapters
 * OBSOLETO: Usa el concepto antiguo de chunks (5s fijos)
 * NUEVO: Sistema de chapters con duración variable y ChapterPlayer
 */

import React from 'react';
import { RenderProgress } from '../../services/studio/types';

interface ChapterRenderResult {
  id: string;
  url: string;
  order: number;
}

interface ProgressivePlayerProps {
  chapters: ChapterRenderResult[];
  renderProgress: RenderProgress;
  format: 'vertical' | 'horizontal';
  onComplete?: () => void;
}

// TODO: Reimplementar con ChapterPlayer cuando se necesite
export const ProgressivePlayer: React.FC<ProgressivePlayerProps> = () => {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center">
        <p className="text-gray-500 text-lg mb-2">
          ⚠️ ProgressivePlayer obsoleto
        </p>
        <p className="text-gray-400 text-sm">
          Usar ChapterPlayer para el nuevo sistema de chapters
        </p>
      </div>
    </div>
  );
};
