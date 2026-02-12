/**
 * 🌍 Global Image Search Agent
 * Búsqueda GLOBAL de imágenes (1 sola vez) y asignación inteligente por capítulo
 * Usa GPT-4o-mini para matching semántico
 */

import { logger } from '../../../utils/logger';
import { BraveImageService } from '../assets/braveImageService';
import { GoogleImageService } from '../assets/googleImageService';

interface ImageCandidate {
  url: string;
  title: string;
  source: 'brave' | 'google';
  width?: number;
  height?: number;
}

export interface ChapterImageAssignment {
  chapterId: string;
  braveImages: string[]; // 0-2 imágenes asignadas
}

export class GlobalImageSearchAgent {
  private braveService: BraveImageService;
  private googleService: GoogleImageService;

  constructor() {
    this.braveService = new BraveImageService();
    this.googleService = new GoogleImageService();
  }

  /**
   * Búsqueda GLOBAL de imágenes (1 sola vez para toda la consulta)
   */
  async searchGlobalImages(query: string): Promise<ImageCandidate[]> {
    logger.info('[GlobalImageSearch] 🔍 Búsqueda global iniciada', { query });

    try {
      // 1. Búsqueda amplia en Brave (20 imágenes)
      const braveResults = await this.braveService.searchImages(query, { 
        count: 20,
        safesearch: 'moderate' // ✅ Corregido: safesearch en minúscula
      });

      logger.debug('[GlobalImageSearch] Brave resultados', { 
        total: braveResults.length // ✅ Corregido: braveResults ya es array
      });

      // 2. Convertir a candidatos
      const candidates: ImageCandidate[] = braveResults.map(img => ({
        url: img.url,
        title: img.title || '',
        source: 'brave' as const,
        width: img.width,
        height: img.height
      }));

      // 3. Filtrar duplicados y genéricos
      const filtered = this.filterImages(candidates);

      logger.info('[GlobalImageSearch] Filtrado completo', {
        original: candidates.length,
        filtered: filtered.length,
        removed: candidates.length - filtered.length
      });

      // 4. Si quedan menos de 6, usar Google como fallback
      if (filtered.length < 6) {
        logger.warn('[GlobalImageSearch] ⚠️ Brave insuficiente, usando Google fallback');
        const googleResults = await this.googleService.searchImages(query, { count: 10 }); // ✅ Corregido: count en lugar de perPage
        
        const googleCandidates: ImageCandidate[] = googleResults.map(img => ({
          url: img.url,
          title: img.title || '',
          source: 'google' as const,
          width: img.width,
          height: img.height
        }));

        filtered.push(...this.filterImages(googleCandidates));
        
        logger.info('[GlobalImageSearch] Google fallback agregado', {
          total: filtered.length
        });
      }

      return filtered;

    } catch (error) {
      logger.error('[GlobalImageSearch] Error en búsqueda global', { error });
      return [];
    }
  }

  /**
   * Filtrar imágenes (eliminar duplicados, genéricos, muy pequeñas)
   */
  private filterImages(candidates: ImageCandidate[]): ImageCandidate[] {
    const seen = new Set<string>();
    const filtered: ImageCandidate[] = [];

    for (const candidate of candidates) {
      // 1. Eliminar duplicados por dominio + path similar
      const urlKey = this.getUrlKey(candidate.url);
      if (seen.has(urlKey)) {
        continue;
      }

      // 2. Eliminar imágenes muy pequeñas
      if (candidate.width && candidate.width < 400) {
        continue;
      }
      if (candidate.height && candidate.height < 400) {
        continue;
      }

      // 3. Eliminar imágenes sin título (probablemente genéricas)
      if (!candidate.title || candidate.title.length < 5) {
        continue;
      }

      seen.add(urlKey);
      filtered.push(candidate);
    }

    return filtered;
  }

  /**
   * Obtener clave única para detectar duplicados
   */
  private getUrlKey(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname.split('/').slice(0, 3).join('/'); // Primeros 3 segmentos
      return `${domain}${path}`;
    } catch {
      return url;
    }
  }

  /**
   * Asignar imágenes a capítulos usando GPT-4o-mini para matching semántico
   */
  async assignImagesToChapters(
    chapters: Array<{ id: string; text: string }>,
    globalImages: ImageCandidate[]
  ): Promise<ChapterImageAssignment[]> {
    logger.info('[GlobalImageSearch] 📊 Asignando imágenes a capítulos (LLM semántico)', {
      chapters: chapters.length,
      images: globalImages.length
    });

    try {
      // Construir prompt para GPT-4o-mini
      const prompt = this.buildAssignmentPrompt(chapters, globalImages);

      // Obtener configuración de Supabase
      const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseEdgeUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing for OpenAI API');
      }

      // Llamar a GPT-4o-mini via fetch-openai edge function
      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente que asigna imágenes a capítulos basándote en relevancia semántica. Responde SOLO con JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return this.parseAssignmentResult(result, chapters, globalImages);
      
    } catch (error) {
      logger.error('[GlobalImageSearch] Error en matching semántico, usando fallback', { error });
      return this.assignImagesSimple(chapters, globalImages);
    }
  }

  /**
   * Construir prompt para el LLM
   */
  private buildAssignmentPrompt(
    chapters: Array<{ id: string; text: string }>,
    images: ImageCandidate[]
  ): string {
    const chaptersText = chapters
      .map((ch, i) => `CAPÍTULO ${i} (ID: ${ch.id}):\n${ch.text.substring(0, 200)}...`)
      .join('\n\n');

    const imagesText = images
      .map((img, i) => `[${i}] ${img.title}`)
      .join('\n');

    return `Asigna entre 0 y 2 imágenes a cada capítulo basándote en relevancia semántica.

${chaptersText}

IMÁGENES DISPONIBLES:
${imagesText}

REGLAS:
1. Cada capítulo puede recibir 0, 1 o 2 imágenes
2. Cada imagen puede usarse solo UNA vez
3. Prioriza relevancia semántica sobre coincidencia exacta de palabras
4. Si una imagen no es relevante para ningún capítulo, no la uses

Responde con JSON en este formato exacto:
{
  "assignments": [
    {
      "chapterId": "ch1",
      "imageIndices": [0, 3],
      "reasoning": "Breve explicación de por qué estas imágenes son relevantes"
    }
  ]
}`;
  }

  /**
   * Parsear resultado del LLM
   */
  private parseAssignmentResult(
    result: any,
    chapters: Array<{ id: string; text: string }>,
    images: ImageCandidate[]
  ): ChapterImageAssignment[] {
    const assignments: ChapterImageAssignment[] = [];
    const usedIndices = new Set<number>();

    for (const assignment of result.assignments || []) {
      const braveImages: string[] = [];

      for (const index of assignment.imageIndices || []) {
        if (index >= 0 && index < images.length && !usedIndices.has(index)) {
          braveImages.push(images[index].url);
          usedIndices.add(index);

          logger.debug('[GlobalImageSearch] Imagen asignada (LLM)', {
            chapterId: assignment.chapterId,
            imageTitle: images[index].title.substring(0, 50),
            reasoning: assignment.reasoning
          });
        }
      }

      assignments.push({
        chapterId: assignment.chapterId,
        braveImages
      });
    }

    // Asegurar que todos los capítulos estén en el resultado
    for (const chapter of chapters) {
      if (!assignments.find(a => a.chapterId === chapter.id)) {
        assignments.push({
          chapterId: chapter.id,
          braveImages: []
        });
      }
    }

    return assignments;
  }

  /**
   * Fallback: asignación simple round-robin si el LLM falla
   */
  private assignImagesSimple(
    chapters: Array<{ id: string; text: string }>,
    globalImages: ImageCandidate[]
  ): ChapterImageAssignment[] {
    logger.info('[GlobalImageSearch] Usando asignación simple (fallback)');
    
    const assignments: ChapterImageAssignment[] = [];
    let imageIndex = 0;

    for (const chapter of chapters) {
      const braveImages: string[] = [];
      
      // Asignar 1-2 imágenes en round-robin
      const numImages = Math.min(2, globalImages.length - imageIndex);
      for (let i = 0; i < numImages; i++) {
        if (imageIndex < globalImages.length) {
          braveImages.push(globalImages[imageIndex].url);
          imageIndex++;
        }
      }

      assignments.push({
        chapterId: chapter.id,
        braveImages
      });

      logger.debug('[GlobalImageSearch] Capítulo asignado (simple)', {
        chapterId: chapter.id,
        assignedCount: braveImages.length
      });
    }

    return assignments;
  }
}
