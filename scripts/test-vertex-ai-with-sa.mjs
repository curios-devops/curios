#!/usr/bin/env node
/**
 * Test Vertex AI con Service Account Key
 * Genera un video con Veo 3.1 usando autenticación de service account
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎬 Test: Vertex AI + Veo 3.1 con Service Account');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Cargar service account key
const keyPath = join(__dirname, '..', 'vertex-ai-veo-key.json');
let serviceAccountKey;

try {
  const keyContent = readFileSync(keyPath, 'utf8');
  serviceAccountKey = JSON.parse(keyContent);
  console.log('✅ Service Account Key cargada');
  console.log(`   Proyecto: ${serviceAccountKey.project_id}`);
  console.log(`   Email: ${serviceAccountKey.client_email}`);
  console.log('');
} catch (error) {
  console.error('❌ Error cargando service account key:',  error.message);
  console.error('');
  console.error('💡 Asegúrate de haber ejecutado:');
  console.error('   bash scripts/setup-vertex-ai-service-account.sh');
  process.exit(1);
}

// Configuración
const PROJECT_ID = serviceAccountKey.project_id;
const LOCATION = 'us-central1';
const MODEL_ID = 'veo-3.1-generate-001';
const PROMPT = 'A golden eagle soaring over snow-capped mountains at sunrise, cinematic shot';

console.log('📋 Configuración:');
console.log(`   Proyecto: ${PROJECT_ID}`);
console.log(`   Región: ${LOCATION}`);
console.log(`   Modelo: ${MODEL_ID}`);
console.log(`   Prompt: ${PROMPT}`);
console.log('');

// Obtener access token usando service account
async function getAccessToken() {
  console.log('🔑 Obteniendo access token...');

  // Crear JWT
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const token = jwt.sign(claim, serviceAccountKey.private_key, {
    algorithm: 'RS256',
  });

  // Intercambiar JWT por access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  console.log('✅ Access token obtenido');
  console.log('');
  return data.access_token;
}

// Generar video
async function generateVideo(accessToken) {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;

  const requestBody = {
    instances: [{ prompt: PROMPT }],
    parameters: {
      aspectRatio: '16:9',
      sampleCount: 1,
    },
  };

  console.log('📤 Enviando request a Vertex AI...');
  console.log(`   Endpoint: ${endpoint}`);
  console.log('');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const status = response.status;
  const body = await response.json();

  console.log(`📥 Status: ${status}`);
  console.log('');

  if (status === 200 || status === 202) {
    console.log('✅ ¡VIDEO GENERATION INICIADO!');
    console.log('');
    console.log('📄 Respuesta:');
    console.log(JSON.stringify(body, null, 2));
    console.log('');

    if (body.name) {
      const operationName = body.name;
      console.log('🎬 Operación Long-Running:');
      console.log(`   ${operationName}`);
      console.log('');
      console.log('💡 Para consultar status:');
      console.log(`   curl -H "Authorization: Bearer \$(gcloud auth print-access-token)" \\`);
      console.log(`     "https://${LOCATION}-aiplatform.googleapis.com/v1/${operationName}"`);
      console.log('');

      return { success: true, operation: operationName };
    }
  } else {
    console.error('❌ ERROR EN GENERACIÓN');
    console.error('');
    console.error('Respuesta:');
    console.error(JSON.stringify(body, null, 2));
    console.error('');

    if (status === 403) {
      console.error('💡 Posibles causas:');
      console.error('   - Service account sin permisos suficientes');
      console.error('   - Billing no habilitado en el proyecto');
      console.error('   - Veo no disponible en tu región/proyecto');
    } else if (status === 404) {
      console.error('💡 Posibles causas:');
      console.error('   - Modelo veo-3.1-generate-001 no disponible');
      console.error('   - Proyecto o región incorrectos');
    }

    return { success: false, error: body };
  }
}

// Poll operation status
async function checkOperationStatus(accessToken, operationName) {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/${operationName}`;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏳ Consultando status de la operación...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const status = response.status;
  const body = await response.json();

  console.log(`📥 Status: ${status}`);
  console.log('');

  if (status === 200) {
    console.log('📄 Estado de la operación:');
    console.log(JSON.stringify(body, null, 2));
    console.log('');

    if (body.done) {
      console.log('✅ ¡OPERACIÓN COMPLETADA!');
      if (body.response) {
        console.log('');
        console.log('🎥 Video generado:');
        console.log(JSON.stringify(body.response, null, 2));
      }
    } else {
      console.log('⏳ Operación aún en progreso...');
      console.log('');
      console.log('💡 El video puede tardar 2-5 minutos en generarse.');
      console.log('   Ejecuta este script nuevamente para ver el progreso.');
    }
  } else {
    console.error('❌ Error consultando operación');
    console.error(JSON.stringify(body, null, 2));
  }
}

// Main
async function main() {
  try {
    // Step 1: Get access token
    const accessToken = await getAccessToken();

    // Step 2: Generate video
    const result = await generateVideo(accessToken);

    if (result.success && result.operation) {
      // Step 3: Check operation status (once)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await checkOperationStatus(accessToken, result.operation);
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test completado');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Error fatal');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error(error);
    process.exit(1);
  }
}

main();
