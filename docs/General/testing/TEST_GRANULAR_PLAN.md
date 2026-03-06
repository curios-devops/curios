# 🧪 Plan de Tests Granulares - Diagnóstico de Chunks

**Fecha:** Febrero 10, 2026  
**Problema:** MediaRecorder genera 0 chunks a pesar de que todo lo demás funciona  
**Estrategia:** Tests incrementales desde lo más simple hasta el flujo completo

---

## 🎯 Objetivo

Encontrar **EXACTAMENTE** dónde falla la generación de chunks usando tests incrementales.

---

## 📊 Situación Actual

**Lo que SÍ funciona:**
- ✅ Canvas en DOM (`canvasInDOM: true`)
- ✅ Video track en estado "live" (`trackReadyState: "live"`)
- ✅ MimeType soportado (`video/webm;codecs=vp8`)
- ✅ requestAnimationFrame implementado
- ✅ Loop completa al 100%

**El problema:**
- ❌ `chunks: 0`
- ❌ `totalSize: 0`
- ❌ `ondataavailable` nunca se dispara con data.size > 0

---

## 🔬 Hipótesis

**Posibles causas:**
1. **Imágenes externas con CORS** → "tainted canvas" → captureStream() falla silenciosamente
2. **Imágenes no completamente procesadas** → canvas no tiene contenido válido
3. **Browser-specific issue** → Safari/Chrome tienen comportamientos diferentes
4. **Timing issue profundo** → Algo en el flujo de rendering

---

## 🧪 Plan de Tests Granulares

### **Nivel 1: Canvas Puro** 🟢
**Objetivo:** Verificar que MediaRecorder básico funciona

**Qué hace:**
- Solo rectángulos de colores
- Sin imágenes externas
- Sin fetch, sin CORS
- Texto simple con número de frame

**Comando:**
```javascript
testLevel1()
```

**Si FUNCIONA → El problema SON las imágenes**  
**Si FALLA → El problema es MediaRecorder o Browser**

---

### **Nivel 2: Imágenes Data URI** 🟡
**Objetivo:** Verificar que imágenes embebidas funcionan

**Qué hace:**
- Imágenes SVG embebidas (data:image/svg+xml)
- Sin fetch externo
- Sin problemas de CORS
- Imágenes garantizadas disponibles

**Comando:**
```javascript
testLevel2()
```

**Si FUNCIONA → El problema es CORS de imágenes externas**  
**Si FALLA → El problema es cómo se usan las imágenes**

---

### **Nivel 3: 1 Imagen Externa** 🔴
**Objetivo:** Verificar impacto de imágenes externas con/sin CORS

**Qué hace:**
- Cargar 1 imagen de picsum.photos (con CORS habilitado)
- Intentar primero con `crossOrigin="anonymous"`
- Si falla, intentar sin CORS
- Detectar "tainted canvas"

**Comando:**
```javascript
testLevel3()
```

**Si FUNCIONA → Las imágenes de Stock necesitan mejor manejo**  
**Si FALLA → Confirma que imágenes externas rompen captureStream**

---

### **Todos los Niveles en Secuencia** 🎯
**Objetivo:** Ejecutar todos y ver dónde falla

**Comando:**
```javascript
testAllLevels()
```

**Resultado esperado:**
```
═══════════════════════════════════════
📊 RESUMEN DE TESTS:
   Nivel 1 (Canvas Puro):    ✅ | ❌
   Nivel 2 (Data URI):       ✅ | ❌ | ⏭️
   Nivel 3 (Imagen Externa): ✅ | ❌ | ⏭️
═══════════════════════════════════════
```

---

## 🔧 Cómo Ejecutar

### 1. Abrir el navegador en http://localhost:8888

### 2. Abrir consola (F12 o Cmd+Option+I)

### 3. Ver tests disponibles:
Al cargar la página verás:
```
🧪 Tests disponibles:
   testLevel1()     - Canvas puro (sin imágenes)
   testLevel2()     - Con imágenes Data URI
   testLevel3()     - Con imagen externa
   testAllLevels()  - Ejecutar todos en secuencia
   testNoAudio()    - Test original
```

### 4. Ejecutar test:

**Recomendado: Empezar con Nivel 1**
```javascript
testLevel1()
```

**O ejecutar todos:**
```javascript
testAllLevels()
```

---

## 📋 Interpretación de Resultados

### Escenario A: Nivel 1 FUNCIONA ✅
```
🎉 NIVEL 1 EXITOSO!
   Chunks: 5
   Size: 234567 bytes
   URL: blob:http://localhost:8888/...
```

**Diagnóstico:** El problema SON las imágenes  
**Siguiente paso:** Ejecutar Nivel 2 para confirmar

---

### Escenario B: Nivel 1 FALLA ❌
```
❌ NIVEL 1 FALLÓ
   Incluso canvas puro no genera chunks
   Problema: MediaRecorder o Browser
```

**Diagnóstico:** Problema más profundo (MediaRecorder o Browser)  
**Siguiente paso:**
1. ¿Qué navegador estás usando? (Chrome, Safari, Firefox)
2. Verificar versión del navegador
3. Probar en otro navegador
4. Verificar permisos/configuración del browser

---

### Escenario C: Nivel 1 y 2 FUNCIONAN, Nivel 3 FALLA
```
🎉 NIVEL 1 EXITOSO!
🎉 NIVEL 2 EXITOSO!
❌ NIVEL 3 FALLÓ
   Imágenes externas causan problema (CORS/tainted canvas)
```

**Diagnóstico:** CORS de imágenes externas  
**Solución:**
1. Usar proxy para imágenes externas
2. Convertir imágenes a data URIs antes de usar
3. Usar servidor que añada headers CORS

---

## 🔍 Detalles Técnicos

### Tainted Canvas
Cuando un canvas usa imágenes de otro origen sin CORS:
- El canvas queda "tainted" (contaminado)
- No se puede leer: `getImageData()`, `toDataURL()`, `toBlob()`
- **Y captureStream() puede fallar silenciosamente** ⚠️

### Solución para CORS:
```typescript
// ANTES (puede causar tainted canvas):
const img = new Image();
img.src = 'https://external.com/image.jpg';

// DESPUÉS (con CORS):
const img = new Image();
img.crossOrigin = 'anonymous';
img.src = 'https://external.com/image.jpg';
```

### Solución alternativa: Proxy
```typescript
// Fetch imagen a través de proxy que agrega CORS
const response = await fetch('/api/proxy-image?url=' + encodeURIComponent(imageUrl));
const blob = await response.blob();
const dataUrl = URL.createObjectURL(blob);
img.src = dataUrl;
```

---

## 🎯 Próximos Pasos Según Resultados

### Si Nivel 1 funciona:
1. ✅ Confirmar que MediaRecorder básico funciona
2. 🔧 Modificar carga de imágenes en InputManager
3. 🔧 Agregar conversión a data URI
4. ✅ Re-test con flujo completo

### Si Nivel 1 falla:
1. 🔍 Verificar browser (Chrome vs Safari vs Firefox)
2. 🔍 Verificar versión del browser
3. 🔍 Revisar configuración de hardware acceleration
4. 🔍 Probar con diferentes mimeTypes

---

## 📝 Logging

Cada test loggea:
- ✅ Éxito/Fallo
- 📊 Número de chunks
- 📊 Tamaño total
- 🎥 URL del video (si se generó)
- 💡 Diagnóstico y siguiente paso

---

## 🚀 Ejemplo de Ejecución

```javascript
// En consola del navegador:
testAllLevels()

// Resultado esperado:
🧪 INICIANDO TESTS GRANULARES

═══════════════════════════════════════

🧪 NIVEL 1: Canvas Puro (sin imágenes)
📊 Stream: {trackState: 'live', trackEnabled: true}
🎬 Grabación iniciada
  ⏳ Frame 0/150
  ⏳ Frame 30/150
  ⏳ Frame 60/150
  ⏳ Frame 90/150
  ⏳ Frame 120/150
✅ Loop completado
✅ Chunk recibido! Size: 45678
✅ Chunk recibido! Size: 48234
✅ Chunk recibido! Size: 42567
🏁 Recorder stopped. Chunks: 3

🎉 NIVEL 1 EXITOSO!
   Chunks: 3
   Size: 136479 bytes
   URL: blob:http://localhost:8888/abc123...

➡️  El problema NO es Canvas/MediaRecorder básico

[Continúa con Nivel 2...]
```

---

**Status:** ✅ Tests creados, listos para ejecutar  
**Archivo:** `/src/services/studio/test/testGranular.ts`  
**Documentación:** Este archivo
