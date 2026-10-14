/**
 * Critic Agent
 * Evaluates video quality and decides when AI generation is worth the cost
 */

import { SceneScore } from '../types';
import { logger } from '../../../utils/logger';

interface StockClip {
  url: string;
  tags?: string[];
  duration: number;
  width?: number;
  height?: number;
}

export class CriticAgent {
  /**
   * Evalúa calidad de un stock clip
   * v1: Heurística simple basada en keywords y metadata
   * v2 TODO: Usar CLIP embeddings para match semántico
   *
   * @returns Score 0-1 (higher is better match)
   */
  evaluateStock(clip: StockClip, prompt: string): number {
    const promptLower = prompt.toLowerCase();
    const tags = clip.tags?.map(t => t.toLowerCase()) || [];

    // 1. Keyword matching
    const keywords = promptLower
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !this.isStopWord(w));

    if (keywords.length === 0) {
      return 0.3; // Default low score if no meaningful keywords
    }

    const matches = keywords.filter(kw =>
      tags.some(tag => tag.includes(kw) || kw.includes(tag))
    );

    const matchRatio = matches.length / keywords.length;

    // 2. Duration bonus (6-10s es ideal)
    const durationScore = clip.duration >= 6 && clip.duration <= 10 ? 0.15 : 0;

    // 3. Resolution bonus (HD+)
    const resolutionScore = (clip.width && clip.width >= 1920) ? 0.1 : 0;

    // Final score (capped at 1.0)
    const finalScore = Math.min(matchRatio * 0.75 + durationScore + resolutionScore, 1.0);

    logger.debug('[CriticAgent] Stock evaluated', {
      matchRatio,
      durationScore,
      resolutionScore,
      finalScore,
      matchedKeywords: matches.length,
      totalKeywords: keywords.length,
    });

    return finalScore;
  }

  /**
   * Computa score compuesto de la escena
   * Pesos: relevance 40%, specificity 20%, complexity 20%, narrative 20%
   */
  computeSceneScore(scores: SceneScore): number {
    const finalScore =
      scores.relevance * 0.4 +
      scores.specificity * 0.2 +
      scores.visualComplexity * 0.2 +
      scores.narrativeWeight * 0.2;

    logger.debug('[CriticAgent] Scene score computed', {
      ...scores,
      finalScore,
    });

    return finalScore;
  }

  /**
   * Calcula specificity del prompt (qué tan detallado)
   * Mayor = más específico = mejor candidato para AI
   *
   * @returns Score 0-1
   */
  calculateSpecificity(prompt: string): number {
    const words = prompt.split(/\s+/);

    // Count detail words (long words, participles, adjectives)
    const detailWords = words.filter(w =>
      w.length > 5 || /ing$|ed$|ly$/.test(w)
    );

    const specificityRatio = detailWords.length / Math.max(words.length, 1);

    // Bonus for descriptive phrases
    const hasDescriptors = /cinematic|dramatic|beautiful|stunning|detailed/.test(
      prompt.toLowerCase()
    );

    const bonus = hasDescriptors ? 0.2 : 0;

    return Math.min(specificityRatio + bonus, 1.0);
  }

  /**
   * Calcula complejidad visual del prompt
   * Mayor = más motion/effects = mejor candidato para AI
   *
   * @returns Score 0-1
   */
  calculateVisualComplexity(prompt: string): number {
    const complexityKeywords = [
      'cinematic', 'dynamic', 'motion', 'moving', 'flying',
      'drone', 'aerial', 'tracking', 'zoom', 'pan',
      'rotating', 'spinning', 'orbiting', 'rising', 'falling',
      'explosion', 'particle', 'smoke', 'fire', 'water',
      'camera movement', 'dolly', 'crane', 'tilt',
    ];

    const promptLower = prompt.toLowerCase();
    const matches = complexityKeywords.filter(kw => promptLower.includes(kw));

    // Max 4 keywords = 1.0 score
    const complexityScore = Math.min(matches.length / 4, 1.0);

    logger.debug('[CriticAgent] Visual complexity calculated', {
      matches: matches.length,
      complexityScore,
      matchedKeywords: matches,
    });

    return complexityScore;
  }

  /**
   * Lista de stop words (palabras comunes a ignorar)
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was',
      'are', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'should', 'could', 'may', 'might',
      'this', 'that', 'these', 'those', 'what', 'which', 'who',
      'when', 'where', 'why', 'how',
    ];

    return stopWords.includes(word.toLowerCase());
  }
}
