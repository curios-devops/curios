/**
 * 🧪 TEST SIMPLE: Renderizar sin audio
 * Para confirmar si el problema es el audio track
 */

import { InputManager } from '../managers/InputManager';
import { ChapterRenderer } from '../rendering/ChapterRenderer';
import { ChapterPlan } from '../types';
import { logger } from '../../../utils/logger';

export async function testNoAudio() {
  console.log('🧪 TEST: Renderizando primer chapter SIN audio');
  logger.info('[Test] Iniciando test sin audio');

  // Plan simple: 1 chapter de 5 segundos
  const testPlan: ChapterPlan = {
    videoId: 'test-no-audio',
    title: 'Test Sin Audio',
    description: 'Diagnóstico de MediaRecorder sin audio track',
    totalDuration: 5,
    chapters: [
      {
        id: 'chapter_test',
        order: 1,
        duration: 5,
        narration: 'Test sin audio para diagnosticar MediaRecorder',
        visualCues: ['tecnología', 'prueba'],
        keywords: ['test', 'technology']
      }
    ]
  };

  try {
    // 1. Preparar chapter
    console.log('📋 Preparando chapter...');
    const inputManager = new InputManager();
    const descriptors = await inputManager.prepareChapters(testPlan);
    console.log(`✅ Chapter preparado:`, {
      id: descriptors[0].id,
      imageCount: descriptors[0].assets.images.length,
      timelineEntries: descriptors[0].timeline.length
    });

    // 2. Renderizar con versión SIMPLE
    const renderer = new ChapterRenderer();
    console.log('🎬 Renderizando con versión SIMPLE (sin audio)...');
    console.log('  (Durará ~5 segundos)');

    const startTime = Date.now();
    
    const videoBlob = await renderer.renderChapterSimple(descriptors[0], (progress) => {
      const currentProgress = Math.floor(progress.progress / 20) * 20;
      if (currentProgress % 20 === 0) {
        console.log(`  ⏳ ${currentProgress}%`);
      }
    });
    
    const renderTime = Date.now() - startTime;

    // 3. Resultados
    console.log('\n✅ TEST EXITOSO! Versión simple funcionó');
    console.log(`📊 Resultados:`);
    console.log(`  - Tiempo: ${(renderTime / 1000).toFixed(2)}s`);
    console.log(`  - Tamaño: ${(videoBlob.size / 1024).toFixed(2)} KB`);
    console.log(`  - Versión: SIMPLE (sin timeline compleja, sin efectos, sin audio)`);

    // 4. Crear URL para ver el video
    const url = URL.createObjectURL(videoBlob);
    console.log(`\n🎥 Video generado con versión simple:`);
    console.log(`  ${url}`);
    console.log(`\n💡 ÉXITO:`);
    console.log(`  ✅ La versión simple genera chunks correctamente`);
    console.log(`  ✅ Canvas + MediaRecorder funcionan`);
    console.log(`  ➡️  Ahora podemos agregar features incrementalmente`);

    renderer.dispose();
    
    return { 
      success: true,
      videoBlob, 
      url,
      renderTime,
      size: videoBlob.size
    };

  } catch (error) {
    console.error('❌ TEST FALLIDO:', error);
    console.log('\n💡 DIAGNÓSTICO:');
    console.log('  Incluso la versión simple falló');
    console.log('  Revisar: Canvas en DOM, MediaRecorder support, mimeType');
    
    logger.error('[Test] Error en test sin audio', { error });
    return {
      success: false,
      error
    };
  }
}
