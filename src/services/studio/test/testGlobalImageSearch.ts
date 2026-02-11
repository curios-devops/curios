/**
 * 🧪 TEST BATERÍA: Global Image Search
 * Tests incrementales de menos a más complejos
 */

import { GlobalImageSearchAgent, type ChapterImageAssignment } from '../agents/GlobalImageSearchAgent';
import { InputManager } from '../managers/InputManager';
import { ChapterPlan } from '../types';
import { logger } from '../../../utils/logger';

/**
 * TEST NIVEL 1: GlobalImageSearchAgent - Búsqueda simple
 */
export async function testGlobalSearch_Level1() {
  console.log('🧪 TEST NIVEL 1: GlobalImageSearchAgent - Búsqueda Simple');
  logger.info('[Test] Nivel 1 - Global Image Search');

  try {
    const agent = new GlobalImageSearchAgent();
    
    // Query simple
    const query = 'coffee morning';
    console.log(`📋 Query: "${query}"`);
    
    const images = await agent.searchGlobalImages(query);
    
    console.log(`✅ Imágenes encontradas: ${images.length}`);
    console.log('📊 Primeras 3 imágenes:');
    images.slice(0, 3).forEach((img, i) => {
      console.log(`   ${i + 1}. ${img.title.substring(0, 50)}...`);
      console.log(`      Source: ${img.source}, URL: ${img.url.substring(0, 60)}...`);
    });
    
    // Validaciones
    if (images.length === 0) {
      console.error('❌ ERROR: No se encontraron imágenes');
      return { success: false, error: 'No images found' };
    }
    
    if (images.length < 6) {
      console.warn(`⚠️ WARNING: Solo ${images.length} imágenes (esperado: 6+)`);
    }
    
    console.log('✅ NIVEL 1 EXITOSO!\n');
    return { success: true, images: images.length };
    
  } catch (error) {
    console.error('❌ NIVEL 1 FALLÓ:', error);
    return { success: false, error };
  }
}

/**
 * TEST NIVEL 2: GlobalImageSearchAgent - Asignación a capítulos
 */
export async function testGlobalSearch_Level2() {
  console.log('🧪 TEST NIVEL 2: GlobalImageSearchAgent - Asignación a Capítulos');
  logger.info('[Test] Nivel 2 - Image Assignment');

  try {
    const agent = new GlobalImageSearchAgent();
    
    // Búsqueda global
    const query = 'blue sky atmosphere light';
    console.log(`📋 Query global: "${query}"`);
    
    const images = await agent.searchGlobalImages(query);
    console.log(`✅ Imágenes globales: ${images.length}`);
    
    // Capítulos simulados
    const chapters = [
      { id: 'ch1', text: 'El cielo es azul porque la luz se dispersa' },
      { id: 'ch2', text: 'La atmósfera contiene partículas que refractan' },
      { id: 'ch3', text: 'Este fenómeno se llama dispersión de Rayleigh' }
    ];
    
    console.log(`📚 Capítulos: ${chapters.length}`);
    
    // Asignación (ahora es async con LLM)
    const assignments = await agent.assignImagesToChapters(chapters, images);
    
    console.log('📊 Asignaciones:');
    assignments.forEach((a: ChapterImageAssignment) => {
      console.log(`   ${a.chapterId}: ${a.braveImages.length} imágenes`);
      if (a.braveImages.length > 0) {
        console.log(`      → ${a.braveImages[0].substring(0, 60)}...`);
      }
    });
    
    // Validaciones
    const totalAssigned = assignments.reduce((sum: number, a: ChapterImageAssignment) => sum + a.braveImages.length, 0);
    console.log(`\n📈 Total asignado: ${totalAssigned} imágenes`);
    
    if (totalAssigned === 0) {
      console.error('❌ ERROR: No se asignaron imágenes');
      return { success: false, error: 'No assignments' };
    }
    
    console.log('✅ NIVEL 2 EXITOSO!\n');
    return { success: true, assignments: assignments.length, totalAssigned };
    
  } catch (error) {
    console.error('❌ NIVEL 2 FALLÓ:', error);
    return { success: false, error };
  }
}

/**
 * TEST NIVEL 3: InputManager - Flujo completo con 1 capítulo
 */
export async function testGlobalSearch_Level3() {
  console.log('🧪 TEST NIVEL 3: InputManager - Flujo Completo (1 Capítulo)');
  logger.info('[Test] Nivel 3 - Complete Flow (1 chapter)');

  try {
    const manager = new InputManager();
    
    // Plan simple con 1 capítulo
    const plan: ChapterPlan = {
      videoId: 'test_video_001',
      title: 'Test Video',
      description: 'Test de búsqueda global',
      totalDuration: 5,
      query: 'coffee morning',
      chapters: [
        {
          id: 'chapter_001',
          order: 1,
          duration: 5,
          narration: 'Una taza de café por la mañana es el mejor comienzo del día.',
          keywords: ['coffee', 'morning', 'breakfast'],
          visualCues: ['coffee cup', 'morning light']
        }
      ]
    };
    
    console.log('📋 Plan creado:', {
      chapters: plan.chapters.length,
      query: plan.query
    });
    
    // Preparar chapters (incluye búsqueda global)
    console.log('⏳ Preparando chapters...');
    const descriptors = await manager.prepareChapters(plan);
    
    console.log(`✅ Descriptors creados: ${descriptors.length}`);
    
    const descriptor = descriptors[0];
    console.log('📊 Primer descriptor:');
    console.log(`   ID: ${descriptor.id}`);
    console.log(`   Duration: ${descriptor.duration}s`);
    console.log(`   Images: ${descriptor.assets.images.length}`);
    console.log(`   Audio: ${descriptor.assets.audio ? '✅' : '❌'}`);
    console.log(`   Background Video: ${descriptor.assets.backgroundVideo ? '✅' : '❌'}`);
    
    descriptor.assets.images.forEach((img, i) => {
      console.log(`   Image ${i + 1}: ${img.url.substring(0, 60)}...`);
    });
    
    // Validaciones
    if (descriptor.assets.images.length === 0) {
      console.error('❌ ERROR: No images in descriptor');
      return { success: false, error: 'No images' };
    }
    
    if (!descriptor.assets.audio) {
      console.error('❌ ERROR: No audio in descriptor');
      return { success: false, error: 'No audio' };
    }
    
    console.log('✅ NIVEL 3 EXITOSO!\n');
    return { 
      success: true, 
      descriptors: descriptors.length,
      images: descriptor.assets.images.length,
      hasAudio: !!descriptor.assets.audio
    };
    
  } catch (error) {
    console.error('❌ NIVEL 3 FALLÓ:', error);
    return { success: false, error };
  }
}

/**
 * TEST NIVEL 4: InputManager - Flujo completo con múltiples capítulos
 */
export async function testGlobalSearch_Level4() {
  console.log('🧪 TEST NIVEL 4: InputManager - Flujo Completo (3 Capítulos)');
  logger.info('[Test] Nivel 4 - Complete Flow (3 chapters)');

  try {
    const manager = new InputManager();
    
    // Plan con 3 capítulos
    const plan: ChapterPlan = {
      videoId: 'test_video_002',
      title: '¿Por qué el cielo es azul?',
      description: 'Explicación científica del color del cielo',
      totalDuration: 15,
      query: 'cielo azul luz atmósfera',
      chapters: [
        {
          id: 'chapter_001',
          order: 1,
          duration: 5,
          narration: 'El cielo es azul debido a un fenómeno llamado dispersión de Rayleigh.',
          keywords: ['cielo', 'azul', 'dispersión'],
          visualCues: ['blue sky', 'atmosphere']
        },
        {
          id: 'chapter_002',
          order: 2,
          duration: 5,
          narration: 'La luz del sol contiene todos los colores del arcoíris.',
          keywords: ['luz', 'sol', 'colores'],
          visualCues: ['sunlight', 'spectrum']
        },
        {
          id: 'chapter_003',
          order: 3,
          duration: 5,
          narration: 'Las moléculas de aire dispersan más la luz azul que los otros colores.',
          keywords: ['moléculas', 'aire', 'luz azul'],
          visualCues: ['molecules', 'scattering']
        }
      ]
    };
    
    console.log('📋 Plan creado:', {
      chapters: plan.chapters.length,
      query: plan.query,
      totalDuration: plan.totalDuration
    });
    
    // Preparar chapters (incluye búsqueda global)
    console.log('⏳ Preparando chapters (esto puede tomar ~30s)...');
    const startTime = Date.now();
    const descriptors = await manager.prepareChapters(plan);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Descriptors creados: ${descriptors.length} (${elapsed}s)`);
    
    // Análisis de cada descriptor
    console.log('\n📊 Análisis por capítulo:');
    descriptors.forEach((desc, i) => {
      console.log(`\n   Chapter ${i + 1} (${desc.id}):`);
      console.log(`      Duration: ${desc.duration}s`);
      console.log(`      Images: ${desc.assets.images.length}`);
      console.log(`      Audio: ${desc.assets.audio ? '✅' : '❌'}`);
      console.log(`      Background Video: ${desc.assets.backgroundVideo ? '✅' : '❌'}`);
      
      if (desc.assets.images.length > 0) {
        console.log('      Imágenes:');
        desc.assets.images.forEach((img, j) => {
          const isDataUri = img.url.startsWith('data:');
          const preview = isDataUri 
            ? `Data URI (${(img.url.length / 1024).toFixed(0)}KB)`
            : img.url.substring(0, 50) + '...';
          console.log(`         ${j + 1}. ${preview}`);
        });
      }
    });
    
    // Validaciones
    const totalImages = descriptors.reduce((sum, d) => sum + d.assets.images.length, 0);
    const withAudio = descriptors.filter(d => !!d.assets.audio).length;
    
    console.log('\n📈 Resumen:');
    console.log(`   Total imágenes: ${totalImages}`);
    console.log(`   Capítulos con audio: ${withAudio}/${descriptors.length}`);
    console.log(`   Tiempo total: ${elapsed}s`);
    
    if (totalImages === 0) {
      console.error('❌ ERROR: No images across all chapters');
      return { success: false, error: 'No images' };
    }
    
    if (withAudio < descriptors.length) {
      console.error(`❌ ERROR: Only ${withAudio}/${descriptors.length} chapters have audio`);
      return { success: false, error: 'Missing audio' };
    }
    
    console.log('\n✅ NIVEL 4 EXITOSO!\n');
    return { 
      success: true, 
      descriptors: descriptors.length,
      totalImages,
      withAudio,
      timeSeconds: parseFloat(elapsed)
    };
    
  } catch (error) {
    console.error('❌ NIVEL 4 FALLÓ:', error);
    return { success: false, error };
  }
}

/**
 * Ejecutar todos los tests en secuencia
 */
export async function testAllGlobalSearch() {
  console.log('═══════════════════════════════════════');
  console.log('🧪 BATERÍA COMPLETA: Global Image Search');
  console.log('═══════════════════════════════════════\n');

  const results: any = {};

  // Nivel 1
  console.log('➡️  Ejecutando Nivel 1...\n');
  results.level1 = await testGlobalSearch_Level1();
  if (!results.level1.success) {
    console.log('❌ Nivel 1 falló, deteniendo tests\n');
    return results;
  }
  await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa 2s

  // Nivel 2
  console.log('➡️  Ejecutando Nivel 2...\n');
  results.level2 = await testGlobalSearch_Level2();
  if (!results.level2.success) {
    console.log('❌ Nivel 2 falló, deteniendo tests\n');
    return results;
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Nivel 3
  console.log('➡️  Ejecutando Nivel 3...\n');
  results.level3 = await testGlobalSearch_Level3();
  if (!results.level3.success) {
    console.log('❌ Nivel 3 falló, deteniendo tests\n');
    return results;
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Nivel 4
  console.log('➡️  Ejecutando Nivel 4...\n');
  results.level4 = await testGlobalSearch_Level4();

  // Resumen
  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMEN DE TESTS:');
  console.log(`   Nivel 1 (Búsqueda Simple):    ${results.level1.success ? '✅' : '❌'}`);
  console.log(`   Nivel 2 (Asignación):         ${results.level2?.success ? '✅' : results.level2 ? '❌' : '⏭️ '}`);
  console.log(`   Nivel 3 (Flujo 1 Capítulo):   ${results.level3?.success ? '✅' : results.level3 ? '❌' : '⏭️ '}`);
  console.log(`   Nivel 4 (Flujo 3 Capítulos):  ${results.level4?.success ? '✅' : results.level4 ? '❌' : '⏭️ '}`);
  console.log('═══════════════════════════════════════\n');

  return results;
}

// Exportar para uso en consola
if (typeof window !== 'undefined') {
  (window as any).testGlobalSearch_Level1 = testGlobalSearch_Level1;
  (window as any).testGlobalSearch_Level2 = testGlobalSearch_Level2;
  (window as any).testGlobalSearch_Level3 = testGlobalSearch_Level3;
  (window as any).testGlobalSearch_Level4 = testGlobalSearch_Level4;
  (window as any).testAllGlobalSearch = testAllGlobalSearch;
}
