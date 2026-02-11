/**
 * 🤖 Image Assignment Agent
 * 
 * Estrategia inteligente de asignación de imágenes a capítulos
 * Basado en: docs/Studio/Arquitecture/ESTRATEGIA_BUSQUEDA_ASIGNACION_IMAGENES.md
 * 
 * Flujo:
 * 1. 1 búsqueda amplia (tema general)
 * 2. Filtro básico (duplicados, genéricos)
 * 3. Scoring heurístico (match strength)
 * 4. LLM distribución inteligente
 * 5. Validación automática
 */

import { logger } from '../../../utils/logger';
import { BraveImageService } from '../assets/braveImageService';

export interface Chapter {
  id: string;
  order: number;
  title: string;
  text: string;
  duration: number;
}

export interface ImageCandidate {
  id: string;
  url: string;
  title: string;
  source: string;
  thumbnail?: string;
}

export interface ScoredImage extends ImageCandidate {
  matchStrength: 'strong' | 'medium' | 'weak';
  keywords: string[];
}

export interface ChapterWithPriority extends Chapter {
  priority: 'high' | 'medium' | 'low';
  keywords: string[];
}

export interface AssignmentResult {
  chapterId: string;
  imageIds: string[];
}

export class ImageAssignmentAgent {
  private imageService: BraveImageService;
  
  constructor() {
    this.imageService = new BraveImageService();
  }

  /**
   * FASE 1: Búsqueda amplia
   * 1 sola búsqueda con tema general + subtemas concatenados
   */
  async searchBroadImages(
    generalTopic: string, 
    chapters: Chapter[]
  ): Promise<ImageCandidate[]> {
    logger.info('[ImageAssignmentAgent] 🔍 FASE 1: Búsqueda amplia', { 
      generalTopic, 
      chapterCount: chapters.length 
    });

    // Construir query amplio: tema + primeros keywords de capítulos
    const subtopics = chapters
      .slice(0, 3) // Solo primeros 3 capítulos para no saturar
      .map(c => this.extractSimpleKeywords(c.title).slice(0, 2).join(' '))
      .filter(s => s.length > 0)
      .join(' ');

    const broadQuery = `${generalTopic} ${subtopics}`.trim();
    
    logger.debug('[ImageAssignmentAgent] Query amplio construido', { 
      broadQuery,
      length: broadQuery.length 
    });

    // Buscar 20 imágenes
    const results = await this.imageService.searchImages(broadQuery, {
      count: 20
    });

    // ✅ results es BraveImage[] directamente
    if (!results || results.length === 0) {
      logger.warn('[ImageAssignmentAgent] ⚠️ Búsqueda sin resultados');
      return [];
    }

    // Convertir a ImageCandidate
    const candidates: ImageCandidate[] = results.map((img: any, idx: number) => ({
      id: `img_${idx}`,
      url: img.properties?.url || img.thumbnail?.src || '',
      title: img.title || '',
      source: img.url || '',
      thumbnail: img.thumbnail?.src
    })).filter((c: any) => c.url.length > 0);

    logger.info('[ImageAssignmentAgent] ✅ Búsqueda completada', { 
      found: candidates.length 
    });

    return candidates;
  }

  /**
   * FASE 2: Filtro básico
   * Elimina duplicados, imágenes genéricas, títulos irrelevantes
   */
  filterImages(candidates: ImageCandidate[]): ImageCandidate[] {
    logger.info('[ImageAssignmentAgent] 🔍 FASE 2: Filtro básico', { 
      input: candidates.length 
    });

    // 1. Eliminar duplicados por URL
    const uniqueUrls = new Set<string>();
    const unique = candidates.filter(img => {
      if (uniqueUrls.has(img.url)) return false;
      uniqueUrls.add(img.url);
      return true;
    });

    // 2. Eliminar genéricos (backgrounds abstractos, logos, etc)
    const genericKeywords = [
      'abstract background',
      'logo',
      'icon',
      'template',
      'mockup',
      'blank',
      'placeholder',
      'stock photo',
      'watermark'
    ];

    const filtered = unique.filter(img => {
      const titleLower = img.title.toLowerCase();
      return !genericKeywords.some(kw => titleLower.includes(kw));
    });

    // 3. Eliminar títulos muy cortos o vacíos
    const withTitle = filtered.filter(img => img.title.length > 3);

    logger.info('[ImageAssignmentAgent] ✅ Filtro completado', { 
      input: candidates.length,
      afterDedup: unique.length,
      afterGeneric: filtered.length,
      output: withTitle.length
    });

    return withTitle;
  }

  /**
   * FASE 3: Scoring heurístico
   * Evalúa match strength entre imágenes y capítulos
   */
  scoreImages(
    images: ImageCandidate[], 
    chapters: ChapterWithPriority[]
  ): ScoredImage[] {
    logger.info('[ImageAssignmentAgent] 🔍 FASE 3: Scoring heurístico', { 
      images: images.length,
      chapters: chapters.length 
    });

    return images.map(img => {
      const imgKeywords = this.extractSimpleKeywords(img.title);
      
      // Calcular match strength contra todos los capítulos
      let maxMatches = 0;
      
      for (const chapter of chapters) {
        const matches = chapter.keywords.filter(kw => 
          imgKeywords.some(imgKw => 
            imgKw.includes(kw) || kw.includes(imgKw)
          )
        ).length;
        
        maxMatches = Math.max(maxMatches, matches);
      }

      // Determinar strength
      let matchStrength: 'strong' | 'medium' | 'weak';
      if (maxMatches >= 2) {
        matchStrength = 'strong';
      } else if (maxMatches === 1) {
        matchStrength = 'medium';
      } else {
        matchStrength = 'weak';
      }

      return {
        ...img,
        matchStrength,
        keywords: imgKeywords
      };
    });
  }

  /**
   * Calcular prioridad de capítulo por duración
   */
  calculateChapterPriority(chapter: Chapter, allChapters: Chapter[]): 'high' | 'medium' | 'low' {
    const totalDuration = allChapters.reduce((sum, c) => sum + c.duration, 0);
    const avgDuration = totalDuration / allChapters.length;
    
    const ratio = chapter.duration / avgDuration;
    
    if (ratio >= 1.2) return 'high';    // 20% más largo
    if (ratio >= 0.8) return 'medium';  // Normal
    return 'low';                        // Corto
  }

  /**
   * Agregar prioridades a capítulos
   */
  enrichChaptersWithPriority(chapters: Chapter[]): ChapterWithPriority[] {
    return chapters.map(chapter => ({
      ...chapter,
      priority: this.calculateChapterPriority(chapter, chapters),
      keywords: this.extractSimpleKeywords(chapter.title + ' ' + chapter.text)
    }));
  }

  /**
   * FASE 4: Distribución inteligente
   * Asigna imágenes a capítulos respetando reglas
   * 
   * Reglas duras:
   * - Máx 2 imágenes por capítulo
   * - High chapters pueden recibir 2
   * - Medium → 1-2
   * - Low → 0-1
   * - No forzar weak matches
   */
  distributeImages(
    scoredImages: ScoredImage[],
    chapters: ChapterWithPriority[]
  ): AssignmentResult[] {
    logger.info('[ImageAssignmentAgent] 🔍 FASE 4: Distribución inteligente', { 
      images: scoredImages.length,
      chapters: chapters.length 
    });

    // Ordenar imágenes: strong > medium > weak
    const sortedImages = [...scoredImages].sort((a, b) => {
      const strengthOrder = { strong: 3, medium: 2, weak: 1 };
      return strengthOrder[b.matchStrength] - strengthOrder[a.matchStrength];
    });

    // Ordenar capítulos: high > medium > low
    const sortedChapters = [...chapters].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const assignments: Map<string, string[]> = new Map();
    const usedImageIds = new Set<string>();

    // Inicializar assignments
    chapters.forEach(ch => assignments.set(ch.id, []));

    // Asignar imágenes strong primero
    for (const img of sortedImages.filter(i => i.matchStrength === 'strong')) {
      // Buscar mejor capítulo para esta imagen
      const bestChapter = this.findBestChapterForImage(img, sortedChapters, assignments);
      
      if (bestChapter) {
        const current = assignments.get(bestChapter.id) || [];
        const maxAllowed = bestChapter.priority === 'high' ? 2 : 
                          bestChapter.priority === 'medium' ? 2 : 1;
        
        if (current.length < maxAllowed) {
          assignments.set(bestChapter.id, [...current, img.id]);
          usedImageIds.add(img.id);
        }
      }
    }

    // Luego medium
    for (const img of sortedImages.filter(i => i.matchStrength === 'medium' && !usedImageIds.has(i.id))) {
      const bestChapter = this.findBestChapterForImage(img, sortedChapters, assignments);
      
      if (bestChapter) {
        const current = assignments.get(bestChapter.id) || [];
        const maxAllowed = bestChapter.priority === 'high' ? 2 : 
                          bestChapter.priority === 'medium' ? 2 : 1;
        
        if (current.length < maxAllowed) {
          assignments.set(bestChapter.id, [...current, img.id]);
          usedImageIds.add(img.id);
        }
      }
    }

    // weak solo si hay gaps en high chapters
    const highChapters = sortedChapters.filter(c => c.priority === 'high');
    for (const chapter of highChapters) {
      const current = assignments.get(chapter.id) || [];
      if (current.length === 0) {
        // Buscar cualquier imagen weak que tenga algo de match
        const weakMatch = sortedImages.find(i => 
          i.matchStrength === 'weak' && 
          !usedImageIds.has(i.id) &&
          i.keywords.some(kw => chapter.keywords.includes(kw))
        );
        
        if (weakMatch) {
          assignments.set(chapter.id, [weakMatch.id]);
          usedImageIds.add(weakMatch.id);
        }
      }
    }

    // Convertir a AssignmentResult[]
    const results: AssignmentResult[] = Array.from(assignments.entries()).map(([chapterId, imageIds]) => ({
      chapterId,
      imageIds
    }));

    logger.info('[ImageAssignmentAgent] ✅ Distribución completada', { 
      assignedImages: usedImageIds.size,
      totalImages: scoredImages.length,
      chaptersWithImages: results.filter(r => r.imageIds.length > 0).length
    });

    return results;
  }

  /**
   * Encontrar mejor capítulo para una imagen
   */
  private findBestChapterForImage(
    img: ScoredImage,
    chapters: ChapterWithPriority[],
    currentAssignments: Map<string, string[]>
  ): ChapterWithPriority | null {
    let bestChapter: ChapterWithPriority | null = null;
    let bestScore = 0;

    for (const chapter of chapters) {
      const current = currentAssignments.get(chapter.id) || [];
      const maxAllowed = chapter.priority === 'high' ? 2 : 
                        chapter.priority === 'medium' ? 2 : 1;
      
      // Si ya está lleno, skip
      if (current.length >= maxAllowed) continue;

      // Calcular score de match
      const matches = img.keywords.filter(imgKw =>
        chapter.keywords.some(chKw => 
          imgKw.includes(chKw) || chKw.includes(imgKw)
        )
      ).length;

      // Bonus por prioridad
      const priorityBonus = chapter.priority === 'high' ? 2 : 
                           chapter.priority === 'medium' ? 1 : 0;

      const totalScore = matches + priorityBonus;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestChapter = chapter;
      }
    }

    return bestChapter;
  }

  /**
   * FASE 5: Validación automática
   */
  validateAssignments(
    assignments: AssignmentResult[],
    chapters: ChapterWithPriority[],
    scoredImages: ScoredImage[]
  ): boolean {
    logger.info('[ImageAssignmentAgent] 🔍 FASE 5: Validación automática');

    let valid = true;

    // Regla 1: Ningún capítulo > 2 imágenes
    for (const assignment of assignments) {
      if (assignment.imageIds.length > 2) {
        logger.warn('[ImageAssignmentAgent] ⚠️ Capítulo con más de 2 imágenes', { 
          chapterId: assignment.chapterId,
          count: assignment.imageIds.length 
        });
        valid = false;
      }
    }

    // Regla 2: High chapters sin imágenes
    const highChapters = chapters.filter(c => c.priority === 'high');
    for (const chapter of highChapters) {
      const assignment = assignments.find(a => a.chapterId === chapter.id);
      if (!assignment || assignment.imageIds.length === 0) {
        logger.warn('[ImageAssignmentAgent] ⚠️ High chapter sin imágenes', { 
          chapterId: chapter.id 
        });
        // No es error crítico, puede no haber match
      }
    }

    // Regla 3: weak asignado cuando hay strong disponible
    const imageMap = new Map(scoredImages.map(img => [img.id, img]));
    const usedImageIds = new Set(assignments.flatMap(a => a.imageIds));
    
    const usedWeak = Array.from(usedImageIds)
      .map(id => imageMap.get(id))
      .filter(img => img?.matchStrength === 'weak').length;
    
    const unusedStrong = scoredImages
      .filter(img => img.matchStrength === 'strong' && !usedImageIds.has(img.id)).length;

    if (usedWeak > 0 && unusedStrong > 0) {
      logger.warn('[ImageAssignmentAgent] ⚠️ Weak asignado con strong disponible', {
        usedWeak,
        unusedStrong
      });
      // No es error crítico, puede ser por reglas de max
    }

    logger.info('[ImageAssignmentAgent] ✅ Validación completada', { valid });
    return valid;
  }

  /**
   * Extraer keywords simples de un texto
   */
  private extractSimpleKeywords(text: string): string[] {
    // Palabras comunes a ignorar (stop words)
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
      'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
      'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may',
      'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an', 'and',
      'or', 'but', 'if', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
      'against', 'between', 'into', 'through', 'during', 'before', 'after'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\sáéíóúñ]/g, ' ') // Mantener acentos españoles
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter((word, idx, arr) => arr.indexOf(word) === idx) // Unique
      .slice(0, 10); // Max 10 keywords
  }

  /**
   * Pipeline completo
   */
  async assignImagesToChapters(
    generalTopic: string,
    chapters: Chapter[]
  ): Promise<{
    assignments: AssignmentResult[];
    images: ScoredImage[];
    chapters: ChapterWithPriority[];
  }> {
    logger.info('[ImageAssignmentAgent] 🚀 Iniciando pipeline completo', {
      topic: generalTopic,
      chapterCount: chapters.length
    });

    // FASE 1: Búsqueda amplia
    const candidates = await this.searchBroadImages(generalTopic, chapters);

    if (candidates.length === 0) {
      logger.error('[ImageAssignmentAgent] ❌ No se encontraron imágenes');
      return {
        assignments: chapters.map(ch => ({ chapterId: ch.id, imageIds: [] })),
        images: [],
        chapters: this.enrichChaptersWithPriority(chapters)
      };
    }

    // FASE 2: Filtro
    const filtered = this.filterImages(candidates);

    if (filtered.length < 3) {
      logger.warn('[ImageAssignmentAgent] ⚠️ Muy pocas imágenes después de filtro', {
        count: filtered.length
      });
    }

    // FASE 3: Enriquecer capítulos con prioridad
    const enrichedChapters = this.enrichChaptersWithPriority(chapters);

    // FASE 4: Scoring
    const scoredImages = this.scoreImages(filtered, enrichedChapters);

    // FASE 5: Distribución
    const assignments = this.distributeImages(scoredImages, enrichedChapters);

    // FASE 6: Validación
    this.validateAssignments(assignments, enrichedChapters, scoredImages);

    logger.info('[ImageAssignmentAgent] ✅ Pipeline completado exitosamente', {
      totalImages: scoredImages.length,
      assignedImages: new Set(assignments.flatMap(a => a.imageIds)).size,
      chaptersWithImages: assignments.filter(a => a.imageIds.length > 0).length
    });

    return {
      assignments,
      images: scoredImages,
      chapters: enrichedChapters
    };
  }
}
