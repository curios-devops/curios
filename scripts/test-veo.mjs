#!/usr/bin/env node
/**
 * Test script para validar conexión a Google Veo 3.1
 * Ejecutar: node scripts/test-veo.mjs
 */

import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env manualmente
const envPath = join(__dirname, '..', '.env');
let API_KEY;

try {
  const envFile = readFileSync(envPath, 'utf8');

  // Intentar VITE_GOOGLE_AI_API_KEY primero
  let match = envFile.match(/VITE_GOOGLE_AI_API_KEY=(.+)/);
  if (match) {
    API_KEY = match[1].trim();
  }

  // Fallback a GEMINI_API_KEY (es la misma API)
  if (!API_KEY) {
    match = envFile.match(/GEMINI_API_KEY=(.+)/);
    if (match) {
      API_KEY = match[1].trim();
      console.log('ℹ️  Usando GEMINI_API_KEY como fallback (es la misma API)\n');
    }
  }

  // Último intento con VEO_API_KEY (legacy)
  if (!API_KEY) {
    match = envFile.match(/VEO_API_KEY=(.+)/);
    if (match) {
      API_KEY = match[1].trim();
      console.log('⚠️  Usando VEO_API_KEY (puede no ser válida para Google AI)\n');
    }
  }
} catch (error) {
  console.error('❌ Error leyendo .env:', error.message);
  process.exit(1);
}

if (!API_KEY) {
  console.error('❌ No se encontró ninguna API key en .env');
  console.error('💡 Agrega una de estas variables:');
  console.error('   - VITE_GOOGLE_AI_API_KEY=AIzaSy...');
  console.error('   - GEMINI_API_KEY=AIzaSy...');
  process.exit(1);
}

// Validar formato de la API key
if (!API_KEY.startsWith('AIzaSy')) {
  console.error('⚠️  ADVERTENCIA: La API key no tiene el formato correcto de Google AI');
  console.error('   Esperado: AIzaSy...');
  console.error(`   Recibido: ${API_KEY.substring(0, 15)}...`);
  console.error('   Esto probablemente fallará. Lee: docs/General/guides/GET_GOOGLE_AI_API_KEY.md\n');
}

console.log('🔑 API Key encontrada:', API_KEY.substring(0, 15) + '...');

// Inicializar cliente
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Modelos disponibles para probar
const MODELS_TO_TEST = [
  'veo-3.1-generate-preview',        // Modelo principal Gemini API
  'veo-3.1-lite-generate-preview',   // El que estabas intentando (puede no existir)
];

async function testModel(modelName) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎬 Probando modelo: ${modelName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const prompt = 'A golden eagle soaring over snow-capped mountains at sunrise, cinematic shot';

  try {
    console.log('📝 Prompt:', prompt);
    console.log('⏳ Iniciando generación...\n');

    const startTime = Date.now();

    // Iniciar generación
    let operation = await ai.models.generateVideos({
      model: modelName,
      prompt: prompt,
    });

    console.log('✅ Operación iniciada:', operation.name);
    console.log('📊 Estado inicial:', operation.done ? 'Completo' : 'Procesando');

    // Polling
    let attempts = 0;
    const maxAttempts = 120; // 20 minutos max
    const pollInterval = 10000; // 10 segundos

    while (!operation.done && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });

      attempts++;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      if (attempts % 6 === 0) { // Cada minuto
        console.log(`⏱️  Esperando... (${elapsed}s transcurridos, intento ${attempts}/${maxAttempts})`);
      }
    }

    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    if (!operation.done) {
      console.error('\n❌ Timeout: Generación excedió 20 minutos');
      return false;
    }

    if (!operation.response?.generatedVideos?.[0]?.video) {
      console.error('\n❌ Error: No hay video en la respuesta');
      console.log('Respuesta completa:', JSON.stringify(operation, null, 2));
      return false;
    }

    // Éxito
    const video = operation.response.generatedVideos[0];
    console.log('\n✅ ¡VIDEO GENERADO CON ÉXITO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏱️  Tiempo total:', totalTime, 'segundos');
    console.log('📹 Video URI:', video.video?.uri || 'N/A');
    console.log('📏 Tamaño archivo:', video.video?.sizeBytes ? `${(video.video.sizeBytes / 1024 / 1024).toFixed(2)} MB` : 'N/A');

    if (video.video?.uri) {
      const downloadUrl = `${video.video.uri}`;
      console.log('\n🔗 URL de descarga:');
      console.log(downloadUrl);
    }

    return true;

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.message.includes('404')) {
      console.error('💡 Este modelo no existe. Prueba con otro.');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.error('💡 Problema de autenticación. Verifica tu API key.');
    } else if (error.message.includes('429')) {
      console.error('💡 Rate limit excedido. Espera un momento y reintenta.');
    }

    console.error('\nDetalles completos del error:');
    console.error(error);

    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando prueba de Google Veo 3.1\n');

  for (const model of MODELS_TO_TEST) {
    const success = await testModel(model);

    if (success) {
      console.log(`\n✅ Modelo funcionando: ${model}`);
      console.log('💡 Usa este modelo en tu VeoProvider.ts\n');
      break; // Si uno funciona, no probamos más
    } else {
      console.log(`\n⚠️  Modelo falló: ${model}\n`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Test completado');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
