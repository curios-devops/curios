# 🧪 TEST DE DIAGNÓSTICO: MediaRecorder sin Audio

## Objetivo
Confirmar si el problema de "chunks vacíos" es causado por el audio track.

## ✅ Setup Completo

El test ya está configurado y listo para ejecutar.

## 🚀 Cómo Ejecutar

### 1. Asegúrate que el dev server esté corriendo
```bash
npm run dev
```

### 2. Abre el navegador en http://localhost:8888

### 3. Abre la consola del navegador (F12 o Cmd+Option+I)

### 4. Ejecuta el test
```javascript
testNoAudio()
```

## 📊 Resultados Esperados

### ✅ Si el test FUNCIONA (genera chunks):
```
🧪 TEST: Renderizando primer chapter SIN audio
📋 Preparando chapter...
✅ Chapter preparado: {...}
🎬 Renderizando SIN audio...
  ⏳ 0%
  ⏳ 20%
  ⏳ 40%
  ⏳ 60%
  ⏳ 80%
  ⏳ 100%

✅ TEST EXITOSO! MediaRecorder funcionó sin audio
📊 Resultados:
  - Tiempo: 5.23s
  - Tamaño: 234.56 KB
  - Chunks generados: SÍ (si ves esto, funcionó)

🎥 Video sin audio generado:
  blob:http://localhost:8888/abc123...

💡 DIAGNÓSTICO:
  Si este test funciona = El problema ES el audio track
  Si este test falla = El problema es otra cosa
```

**→ DIAGNÓSTICO: El audio track está bloqueando el MediaRecorder**
**→ SOLUCIÓN: Arreglar el timing del audio (no iniciar source.start() inmediatamente)**

### ❌ Si el test FALLA (0 chunks):
```
🧪 TEST: Renderizando primer chapter SIN audio
...
❌ TEST FALLIDO: Error: Test failed: No video data recorded

💡 DIAGNÓSTICO:
  El problema NO es solo el audio track
  Hay un issue más profundo con MediaRecorder o Canvas
```

**→ DIAGNÓSTICO: El problema es más profundo (Canvas stream, MediaRecorder config, etc.)**

## 🔍 Logs Adicionales

Durante el test verás logs detallados en la consola:
- `[ChapterRenderer] 🧪 TEST: Renderizando SIN audio`
- `[ChapterRenderer] 🧪 Stream configuration (NO AUDIO)`
- `[ChapterRenderer] 🧪 ondataavailable fired`
- `[ChapterRenderer] 🧪 MediaRecorder stopped`

Estos logs te dirán exactamente qué está pasando.

## 📹 Ver el Video Generado

Si el test funciona, copia la URL del blob y:
1. Pégala en la barra de direcciones del navegador, O
2. Haz clic derecho → "Abrir en nueva pestaña"

El video se reproducirá sin audio (es esperado, es para el test).

## 🔧 Próximos Pasos

### Si el test funciona:
1. ✅ Confirmamos que el audio es el problema
2. 🔧 Arreglamos el `prepareAudio()` para no iniciar el source inmediatamente
3. 🔧 Iniciamos el audio sincronizado con el rendering
4. ✅ Test completo con audio funcionando

### Si el test falla:
1. ⚠️ El problema es más profundo
2. 🔍 Investigar Canvas stream configuration
3. 🔍 Verificar MediaRecorder mimeType support
4. 🔍 Verificar timing de start/stop

## 📝 Código del Test

Los archivos creados:
- `/src/services/studio/test/testNoAudio.ts` - Función de test
- `/src/services/studio/rendering/ChapterRenderer.ts` - Método `testRenderNoAudio()`
- `/src/main.tsx` - Exposición en `window.testNoAudio()`
- `/src/global.d.ts` - Tipos TypeScript

## ⚡ Quick Start

```javascript
// En la consola del navegador:
testNoAudio()
```

¡Eso es todo! 🎉
