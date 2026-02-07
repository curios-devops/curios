/**
 * Test Chapter Rendering System
 * Simple test para verificar que todo funciona
 */

import { InputManager } from '../managers/InputManager';
import { ChapterRenderer } from '../rendering/ChapterRenderer';
import { ChapterPlan } from '../types';
import { logger } from '../../../utils/logger';

export async function testChapterRendering() {
  console.log('🧪 Iniciando test de chapter rendering...');
  logger.info('[Test] Iniciando test completo del sistema');

  // 1. Plan de prueba (3 chapters de 5 segundos cada uno)
  const testPlan: ChapterPlan = {
    videoId: 'test-video-001',
    title: 'Test Video - Chapter System',
    description: 'Testing client-side chapter rendering',
    totalDuration: 15,
    chapters: [
      {
        id: 'chapter_001',
        order: 1,
        duration: 5,
        narration: 'Este es el primer chapter de prueba con imágenes y efectos',
        visualCues: ['paisaje natural', 'tecnología moderna'],
        keywords: ['nature', 'landscape', 'technology']
      },
      {
        id: 'chapter_002',
        order: 2,
        duration: 5,
        narration: 'Segundo chapter con más contenido visual y narración extendida',
        visualCues: ['ciencia', 'innovación', 'futuro'],
        keywords: ['science', 'innovation', 'research']
      },
      {
        id: 'chapter_003',
        order: 3,
        duration: 5,
        narration: 'Chapter final de la prueba con conclusiones y efectos de cierre',
        visualCues: ['éxito', 'conclusión', 'futuro'],
        keywords: ['future', 'success', 'conclusion']
      }
    ]
  };

  try {
    // 2. Preparar chapters con InputManager
    console.log('📋 Preparando chapters...');
    const inputManager = new InputManager();
    const descriptors = await inputManager.prepareChapters(testPlan);
    console.log(`✅ ${descriptors.length} chapters preparados`);
    
    descriptors.forEach((desc, i) => {
      console.log(`  Chapter ${i + 1}:`, {
        id: desc.id,
        duration: desc.duration,
        imageCount: desc.assets.images.length,
        timelineEntries: desc.timeline.length
      });
    });

    // 3. Renderizar primer chapter como prueba
    const renderer = new ChapterRenderer();
    console.log('🎬 Renderizando primer chapter...');
    console.log('  (Esto puede tomar 5-10 segundos)');

    const startTime = Date.now();
    let lastProgress = 0;
    
    const videoBlob = await renderer.renderChapter(descriptors[0], (progress) => {
      const currentProgress = Math.floor(progress.progress / 10) * 10;
      if (currentProgress !== lastProgress && currentProgress % 20 === 0) {
        console.log(`  ⏳ Progreso: ${currentProgress}%`);
        lastProgress = currentProgress;
      }
    });
    
    const renderTime = Date.now() - startTime;

    // 4. Resultados
    console.log('\n✅ Chapter renderizado exitosamente!');
    console.log(`📊 Estadísticas:`);
    console.log(`  - Tiempo de render: ${(renderTime / 1000).toFixed(2)}s`);
    console.log(`  - Tamaño del video: ${(videoBlob.size / 1024).toFixed(2)} KB`);
    console.log(`  - Formato: video/webm`);
    console.log(`  - Resolución: 720x1280 (portrait)`);
    console.log(`  - FPS: 30`);

    // 5. Crear URL para descargar/ver
    const url = URL.createObjectURL(videoBlob);
    console.log(`\n🎥 Video listo:`);
    console.log(`  URL: ${url}`);
    console.log(`  💾 Puedes copiar esta URL y pegarla en el navegador para ver el video`);
    console.log(`  O hacer clic derecho → "Guardar como..." para descargarlo`);

    // 6. Análisis de timeline
    console.log(`\n📋 Timeline del chapter:`);
    descriptors[0].timeline.forEach((entry, i) => {
      console.log(`  ${i + 1}. [${entry.timestamp.toFixed(1)}s] ${entry.action}`, entry.data);
    });

    // 7. Cleanup
    renderer.dispose();
    console.log('\n✨ Test completado exitosamente!');
    
    return { 
      success: true,
      videoBlob, 
      url, 
      descriptors,
      renderTime,
      stats: {
        chapters: descriptors.length,
        totalDuration: testPlan.totalDuration,
        videoSize: videoBlob.size,
        renderTimeMs: renderTime
      }
    };

  } catch (error) {
    console.error('❌ Error en el test:', error);
    logger.error('[Test] Error en test de chapter rendering', { error });
    return {
      success: false,
      error
    };
  }
}

// Para ejecutar desde consola del navegador:
// import { testChapterRendering } from './services/studio/test/testChapterRendering';
// testChapterRendering().then(result => console.log('Test result:', result));
