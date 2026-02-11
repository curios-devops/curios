/**
 * 🧪 TEST GRANULAR: Incrementar complejidad paso a paso
 * Objetivo: Aislar EXACTAMENTE dónde falla la generación de chunks
 */

import { ChapterRenderer } from '../rendering/ChapterRenderer';
import { logger } from '../../../utils/logger';

/**
 * NIVEL 1: Canvas PURO - Sin imágenes externas
 * Solo rectángulos de colores alternados
 */
export async function testLevel1_CanvasPuro() {
  console.log('🧪 NIVEL 1: Canvas Puro (sin imágenes)');
  logger.info('[Test] Nivel 1 - Canvas puro sin imágenes');

  try {
    const renderer = new ChapterRenderer();
    const canvas = (renderer as any).canvas;
    const ctx = (renderer as any).ctx;
    
    // Crear stream
    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];
    
    console.log('📊 Stream:', {
      trackState: videoTrack.readyState,
      trackEnabled: videoTrack.enabled
    });
    
    // MediaRecorder
    const mimeType = 'video/webm;codecs=vp8';
    const recorder = new MediaRecorder(stream, { mimeType });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        console.log(`✅ Chunk recibido! Size: ${e.data.size}`);
      }
    };
    
    const done = new Promise<void>(resolve => {
      recorder.onstop = () => {
        console.log(`🏁 Recorder stopped. Chunks: ${chunks.length}`);
        resolve();
      };
    });
    
    recorder.start(1000);
    console.log('🎬 Grabación iniciada');
    
    // Renderizar 150 frames (5 segundos @ 30fps)
    // Solo colores alternados - SIN IMÁGENES
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
    const totalFrames = 150;
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const colorIndex = Math.floor((frame / totalFrames) * colors.length);
      const color = colors[colorIndex];
      
      // Dibujar rectángulo de color
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 720, 1280);
      
      // Dibujar número de frame
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Frame ${frame}`, 360, 640);
      
      // Esperar siguiente frame (33ms @ 30fps)
      await new Promise(r => setTimeout(r, 33));
      
      if (frame % 30 === 0) {
        console.log(`  ⏳ Frame ${frame}/150`);
      }
    }
    
    console.log('✅ Loop completado');
    
    // Detener
    await new Promise(r => setTimeout(r, 200));
    recorder.stop();
    await done;
    
    // Resultados
    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      console.log('\n🎉 NIVEL 1 EXITOSO!');
      console.log(`   Chunks: ${chunks.length}`);
      console.log(`   Size: ${blob.size} bytes`);
      console.log(`   URL: ${url}`);
      console.log('\n➡️  El problema NO es Canvas/MediaRecorder básico');
      
      renderer.dispose();
      return { success: true, url, chunks: chunks.length };
    } else {
      console.log('\n❌ NIVEL 1 FALLÓ');
      console.log('   Incluso canvas puro no genera chunks');
      console.log('   Problema: MediaRecorder o Browser');
      
      renderer.dispose();
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ Error en Nivel 1:', error);
    return { success: false, error };
  }
}

/**
 * NIVEL 2: Con Imágenes Data URI
 * Imágenes simples embebidas, sin fetch externo
 */
export async function testLevel2_ConDataURI() {
  console.log('\n🧪 NIVEL 2: Con Imágenes Data URI (embebidas)');
  logger.info('[Test] Nivel 2 - Con imágenes data URI');

  try {
    const renderer = new ChapterRenderer();
    const canvas = (renderer as any).canvas;
    const ctx = (renderer as any).ctx;
    
    // Crear imágenes SVG simples (data URIs)
    const createSVGImage = (color: string, text: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280">
          <rect fill="${color}" width="720" height="1280"/>
          <text x="360" y="640" font-size="48" fill="white" text-anchor="middle" font-family="Arial">${text}</text>
        </svg>`;
        
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = 'data:image/svg+xml;base64,' + btoa(svg);
      });
    };
    
    console.log('📸 Creando imágenes SVG...');
    const images = await Promise.all([
      createSVGImage('#FF6B6B', 'Image 1'),
      createSVGImage('#4ECDC4', 'Image 2'),
      createSVGImage('#45B7D1', 'Image 3'),
      createSVGImage('#FFA07A', 'Image 4'),
      createSVGImage('#98D8C8', 'Image 5')
    ]);
    console.log(`✅ ${images.length} imágenes SVG creadas`);
    
    // Setup recorder
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp8' 
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        console.log(`✅ Chunk: ${e.data.size} bytes`);
      }
    };
    
    const done = new Promise<void>(r => recorder.onstop = () => r());
    recorder.start(1000);
    
    // Renderizar con imágenes
    const totalFrames = 150;
    for (let frame = 0; frame < totalFrames; frame++) {
      const imgIndex = Math.floor((frame / totalFrames) * images.length);
      const img = images[imgIndex];
      
      // Dibujar imagen
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 720, 1280);
      ctx.drawImage(img, 0, 0, 720, 1280);
      
      await new Promise(r => setTimeout(r, 33));
      
      if (frame % 30 === 0) {
        console.log(`  ⏳ Frame ${frame}/150`);
      }
    }
    
    await new Promise(r => setTimeout(r, 200));
    recorder.stop();
    await done;
    
    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      console.log('\n🎉 NIVEL 2 EXITOSO!');
      console.log(`   Chunks: ${chunks.length}`);
      console.log(`   Size: ${blob.size} bytes`);
      console.log(`   URL: ${url}`);
      console.log('\n➡️  Imágenes Data URI funcionan. Problema: Imágenes externas');
      
      renderer.dispose();
      return { success: true, url };
    } else {
      console.log('\n❌ NIVEL 2 FALLÓ');
      console.log('   Data URIs tampoco generan chunks');
      
      renderer.dispose();
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ Error en Nivel 2:', error);
    return { success: false, error };
  }
}

/**
 * NIVEL 3: Con 1 Imagen Externa
 * Verificar si imágenes externas causan "tainted canvas"
 */
export async function testLevel3_ImagenExterna() {
  console.log('\n🧪 NIVEL 3: Con 1 Imagen Externa');
  logger.info('[Test] Nivel 3 - Imagen externa con CORS');

  try {
    const renderer = new ChapterRenderer();
    const canvas = (renderer as any).canvas;
    const ctx = (renderer as any).ctx;
    
    // Cargar UNA imagen externa (que tenga CORS habilitado)
    console.log('📸 Cargando imagen externa...');
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Intentar con CORS
    
    const imgLoaded = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        console.log(`✅ Imagen cargada: ${img.width}x${img.height}`);
        resolve(img);
      };
      img.onerror = () => {
        console.log('❌ Error cargando imagen con CORS');
        // Intentar sin CORS
        const img2 = new Image();
        img2.onload = () => {
          console.log(`✅ Imagen cargada sin CORS: ${img2.width}x${img2.height}`);
          resolve(img2);
        };
        img2.onerror = () => reject(new Error('No se pudo cargar imagen'));
        img2.src = 'https://picsum.photos/720/1280';
      };
    });
    
    // URL de imagen con CORS habilitado (picsum.photos)
    img.src = 'https://picsum.photos/720/1280';
    const loadedImg = await imgLoaded;
    
    // Setup recorder
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp8' 
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        console.log(`✅ Chunk: ${e.data.size} bytes`);
      }
    };
    
    const done = new Promise<void>(r => recorder.onstop = () => r());
    recorder.start(1000);
    
    // Renderizar con la imagen externa
    const totalFrames = 150;
    for (let frame = 0; frame < totalFrames; frame++) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 720, 1280);
      
      try {
        ctx.drawImage(loadedImg, 0, 0, 720, 1280);
      } catch (e) {
        console.log('⚠️  Error dibujando imagen (tainted canvas?):', e);
        // Dibujar color de fallback
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, 720, 1280);
      }
      
      await new Promise(r => setTimeout(r, 33));
      
      if (frame % 30 === 0) {
        console.log(`  ⏳ Frame ${frame}/150`);
      }
    }
    
    await new Promise(r => setTimeout(r, 200));
    recorder.stop();
    await done;
    
    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      console.log('\n🎉 NIVEL 3 EXITOSO!');
      console.log(`   Imagen externa funciona con CORS`);
      console.log(`   Chunks: ${chunks.length}`);
      console.log(`   URL: ${url}`);
      
      renderer.dispose();
      return { success: true, url };
    } else {
      console.log('\n❌ NIVEL 3 FALLÓ');
      console.log('   Imágenes externas causan problema (CORS/tainted canvas)');
      
      renderer.dispose();
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ Error en Nivel 3:', error);
    return { success: false, error };
  }
}

/**
 * NIVEL 4: Flujo Real con Imágenes Data URI
 * Usa InputManager + ChapterDescriptor PERO reemplaza imágenes con Data URIs
 */
export async function testLevel4_FlujoRealConDataURI() {
  console.log('\n🧪 NIVEL 4: Flujo Real con Imágenes Data URI');
  logger.info('[Test] Nivel 4 - Flujo real con imágenes seguras');

  try {
    const { InputManager } = await import('../managers/InputManager');
    const { ChapterRenderer } = await import('../rendering/ChapterRenderer');
    
    // 1. Preparar chapter con InputManager (flujo real)
    console.log('📋 Preparando chapter con InputManager...');
    const inputManager = new InputManager();
    
    const testPlan = {
      videoId: 'test-level-4',
      title: 'Test Nivel 4',
      description: 'Test con flujo real pero imágenes seguras',
      totalDuration: 5,
      chapters: [{
        id: 'chapter_level4',
        order: 1,
        duration: 5,
        narration: 'Test con nuestro flujo real pero imágenes Data URI seguras',
        visualCues: ['test', 'nivel 4'],
        keywords: ['test']
      }]
    };
    
    const descriptors = await inputManager.prepareChapters(testPlan);
    const descriptor = descriptors[0];
    
    console.log(`✅ Chapter preparado:`, {
      id: descriptor.id,
      imageCount: descriptor.assets.images.length,
      timelineEntries: descriptor.timeline.length
    });
    
    // 2. REEMPLAZAR imágenes de Brave con Data URIs seguras
    console.log('🔄 Reemplazando imágenes con Data URIs seguras...');
    
    const createSafeSVG = (index: number): string => {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
      const color = colors[index % colors.length];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280">
        <rect fill="${color}" width="720" height="1280"/>
        <text x="360" y="640" font-size="64" fill="white" text-anchor="middle" font-family="Arial">Image ${index + 1}</text>
      </svg>`;
      return 'data:image/svg+xml;base64,' + btoa(svg);
    };
    
    descriptor.assets.images = descriptor.assets.images.map((img, idx) => ({
      ...img,
      url: createSafeSVG(idx)
    }));
    
    console.log(`✅ Imágenes reemplazadas: ${descriptor.assets.images.length} Data URIs`);
    
    // 3. Renderizar con nuestro método simple
    console.log('🎬 Renderizando con renderChapterSimple()...');
    const renderer = new ChapterRenderer();
    
    let progressCount = 0;
    const videoBlob = await renderer.renderChapterSimple(descriptor, (progress) => {
      const currentProgress = Math.floor(progress.progress / 20) * 20;
      if (currentProgress !== progressCount && currentProgress % 20 === 0) {
        console.log(`  ⏳ ${currentProgress}%`);
        progressCount = currentProgress;
      }
    });
    
    // 4. Resultados
    if (videoBlob.size > 0) {
      const url = URL.createObjectURL(videoBlob);
      
      console.log('\n🎉 NIVEL 4 EXITOSO!');
      console.log(`   Nuestro flujo funciona con imágenes seguras`);
      console.log(`   Size: ${(videoBlob.size / 1024).toFixed(2)} KB`);
      console.log(`   URL: ${url}`);
      console.log('\n➡️  El problema SON las imágenes de Brave/Stock (sin CORS)');
      
      renderer.dispose();
      return { success: true, url, size: videoBlob.size };
    } else {
      console.log('\n❌ NIVEL 4 FALLÓ');
      console.log('   Hay un problema en nuestro flujo incluso con imágenes seguras');
      
      renderer.dispose();
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ Error en Nivel 4:', error);
    return { success: false, error };
  }
}

/**
 * NIVEL 5: Flujo Real con Imágenes de Brave (tal cual)
 * El test completo con imágenes reales de Brave para confirmar CORS issue
 */
export async function testLevel5_FlujoRealConBrave() {
  console.log('\n🧪 NIVEL 5: Flujo Real con Imágenes de Brave');
  logger.info('[Test] Nivel 5 - Flujo real con imágenes de Brave');

  try {
    const { InputManager } = await import('../managers/InputManager');
    const { ChapterRenderer } = await import('../rendering/ChapterRenderer');
    
    // 1. Preparar chapter con InputManager (flujo COMPLETO real)
    console.log('📋 Preparando chapter con InputManager (imágenes reales de Brave)...');
    const inputManager = new InputManager();
    
    const testPlan = {
      videoId: 'test-level-5',
      title: 'Test Nivel 5',
      description: 'Test con flujo real e imágenes de Brave',
      totalDuration: 5,
      chapters: [{
        id: 'chapter_level5',
        order: 1,
        duration: 5,
        narration: 'Test con imágenes reales de Brave para verificar CORS',
        visualCues: ['technology', 'innovation'],
        keywords: ['technology', 'digital']
      }]
    };
    
    const descriptors = await inputManager.prepareChapters(testPlan);
    const descriptor = descriptors[0];
    
    console.log(`✅ Chapter preparado con imágenes de Brave:`, {
      id: descriptor.id,
      imageCount: descriptor.assets.images.length,
      imageUrls: descriptor.assets.images.slice(0, 3).map(img => img.url.substring(0, 50))
    });
    
    // 2. Verificar si canvas queda "tainted"
    console.log('🔍 Verificando si imágenes causan "tainted canvas"...');
    
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 720;
    testCanvas.height = 1280;
    const testCtx = testCanvas.getContext('2d')!;
    
    // Intentar cargar una imagen de Brave
    const testImg = new Image();
    // NO usar crossOrigin para simular nuestro código actual
    
    const imgTest = await new Promise<boolean>((resolve) => {
      testImg.onload = () => {
        try {
          testCtx.drawImage(testImg, 0, 0, 720, 1280);
          // Intentar leer el canvas
          testCanvas.toDataURL();
          console.log('✅ Canvas NO está tainted (imagen permite lectura)');
          resolve(true);
        } catch (e) {
          console.log('⚠️  Canvas está TAINTED (imagen bloquea lectura):', e);
          resolve(false);
        }
      };
      testImg.onerror = () => {
        console.log('❌ Error cargando imagen para test');
        resolve(false);
      };
      testImg.src = descriptor.assets.images[0].url;
    });
    
    // 3. Renderizar con método simple
    console.log('🎬 Renderizando con renderChapterSimple()...');
    const renderer = new ChapterRenderer();
    
    let progressCount = 0;
    const videoBlob = await renderer.renderChapterSimple(descriptor, (progress) => {
      const currentProgress = Math.floor(progress.progress / 20) * 20;
      if (currentProgress !== progressCount && currentProgress % 20 === 0) {
        console.log(`  ⏳ ${currentProgress}%`);
        progressCount = currentProgress;
      }
    });
    
    // 4. Resultados
    if (videoBlob.size > 0) {
      const url = URL.createObjectURL(videoBlob);
      
      console.log('\n🎉 NIVEL 5 EXITOSO!');
      console.log(`   Las imágenes de Brave SÍ funcionan`);
      console.log(`   Tainted test: ${imgTest ? 'OK' : 'TAINTED'}`);
      console.log(`   Size: ${(videoBlob.size / 1024).toFixed(2)} KB`);
      console.log(`   URL: ${url}`);
      console.log('\n💡 Entonces el problema está en otro lado (timeline? efectos?)');
      
      renderer.dispose();
      return { success: true, url, tainted: !imgTest };
    } else {
      console.log('\n❌ NIVEL 5 FALLÓ');
      console.log(`   Imágenes de Brave causan problema`);
      console.log(`   Tainted test: ${imgTest ? 'OK' : 'TAINTED'}`);
      console.log('\n💡 SOLUCIÓN: Usar proxy o convertir a Data URI');
      
      renderer.dispose();
      return { success: false, tainted: !imgTest };
    }
    
  } catch (error) {
    console.error('❌ Error en Nivel 5:', error);
    return { success: false, error };
  }
}

/**
 * Ejecutar todos los niveles en secuencia
 */
export async function testAllLevels() {
  console.log('🧪 INICIANDO TESTS GRANULARES\n');
  console.log('═══════════════════════════════════════\n');
  
  const results = {
    level1: await testLevel1_CanvasPuro(),
    level2: null as any,
    level3: null as any,
    level4: null as any,
    level5: null as any
  };
  
  if (results.level1.success) {
    results.level2 = await testLevel2_ConDataURI();
    
    if (results.level2.success) {
      results.level3 = await testLevel3_ImagenExterna();
      
      if (results.level3.success) {
        results.level4 = await testLevel4_FlujoRealConDataURI();
        
        if (results.level4.success) {
          results.level5 = await testLevel5_FlujoRealConBrave();
        }
      }
    }
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMEN DE TESTS:');
  console.log(`   Nivel 1 (Canvas Puro):    ${results.level1.success ? '✅' : '❌'}`);
  console.log(`   Nivel 2 (Data URI):       ${results.level2?.success ? '✅' : results.level2 ? '❌' : '⏭️ '}`);
  console.log(`   Nivel 3 (Imagen Externa): ${results.level3?.success ? '✅' : results.level3 ? '❌' : '⏭️ '}`);
  console.log(`   Nivel 4 (Flujo + DataURI):${results.level4?.success ? '✅' : results.level4 ? '❌' : '⏭️ '}`);
  console.log(`   Nivel 5 (Flujo + Brave):  ${results.level5?.success ? '✅' : results.level5 ? '❌' : '⏭️ '}`);
  console.log('═══════════════════════════════════════\n');
  
  return results;
}

/**
 * NIVEL 6: Video + Audio (TTS)
 * Test completo con audio de TTS integrado
 */
export async function testLevel6_VideoConAudio() {
  console.log('🧪 NIVEL 6: Video + Audio (TTS)');
  logger.info('[Test] Nivel 6 - Video con audio TTS');

  try {
    const { InputManager } = await import('../managers/InputManager');
    
    // 1. Preparar chapter con InputManager (flujo COMPLETO)
    console.log('� Preparando chapter con audio TTS...');
    const inputManager = new InputManager();
    
    const testPlan = {
      videoId: 'test-level-6',
      title: 'Test Nivel 6 - Audio + Video',
      description: 'Test completo con TTS y video',
      totalDuration: 5,
      chapters: [{
        id: 'chapter_level6',
        order: 1,
        duration: 5,
        narration: 'This is a test of audio and video integration. If you can hear this along with the video, everything is working perfectly!',
        visualCues: ['coffee shop', 'cozy atmosphere', 'morning light'],
        keywords: ['coffee', 'café', 'morning']
      }]
    };
    
    console.log('🔍 Preparando chapters con imágenes y audio TTS...');
    const descriptors = await inputManager.prepareChapters(testPlan);
    const descriptor = descriptors[0];
    
    console.log(`✅ Chapter preparado:`, {
      id: descriptor.id,
      imageCount: descriptor.assets.images.length,
      hasAudio: !!descriptor.assets.audio,
      audioSize: descriptor.assets.audio?.size ? `${(descriptor.assets.audio.size / 1024).toFixed(2)} KB` : 'N/A'
    });
    
    // 2. Renderizar
    console.log('🎬 Renderizando video con audio...');
    const { ChapterRenderer } = await import('../rendering/ChapterRenderer');
    const renderer = new ChapterRenderer();
    const startTime = Date.now();
    
    let lastProgress = 0;
    const videoBlob = await renderer.renderChapterSimple(descriptor, (progress) => {
      const current = Math.floor(progress.progress);
      if (current > lastProgress && current % 20 === 0) {
        console.log(`⏳ Progreso: ${current}%`);
        lastProgress = current;
      }
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('✅ NIVEL 6 EXITOSO!');
    console.log(`   Tamaño video: ${(videoBlob.size / 1024).toFixed(2)} KB`);
    console.log(`   Tipo: ${videoBlob.type}`);
    console.log(`   Tiempo: ${elapsed}s`);
    console.log(`   Tiene audio: ${descriptor.assets.audio ? 'SÍ' : 'NO'}`);
    if (descriptor.assets.audio) {
      console.log(`   Tamaño audio: ${(descriptor.assets.audio.size / 1024).toFixed(2)} KB`);
    }
    
    // Descargar para verificar manualmente
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-level-6-video-audio.webm';
    a.click();
    console.log('💾 Video descargado: test-level-6-video-audio.webm');
    console.log('🔊 ¡IMPORTANTE! Verifica que el video tenga audio reproducible');
    
    return {
      success: true,
      videoSize: videoBlob.size,
      audioSize: descriptor.assets.audio?.size || 0,
      elapsed
    };
    
  } catch (error) {
    console.error('❌ NIVEL 6 FALLIDO:', error);
    logger.error('[Test] Nivel 6 falló', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Exportar para uso en consola
if (typeof window !== 'undefined') {
  (window as any).testLevel1 = testLevel1_CanvasPuro;
  (window as any).testLevel2 = testLevel2_ConDataURI;
  (window as any).testLevel3 = testLevel3_ImagenExterna;
  (window as any).testLevel4 = testLevel4_FlujoRealConDataURI;
  (window as any).testLevel5 = testLevel5_FlujoRealConBrave;
  (window as any).testLevel6 = testLevel6_VideoConAudio;
  (window as any).testAllLevels = testAllLevels;
}
