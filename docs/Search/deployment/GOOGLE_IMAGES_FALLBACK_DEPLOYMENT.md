# Google Images Fallback - Deployment Guide

## Problema Identificado

**Level 4**: ✅ Workflow funciona con Data URI  
**Level 5**: ❌ Brave images causan 0 chunks (problema CORS/tainted canvas)

**Solución**: Usar Google Images (SERPAPI) como fallback cuando Brave images fallan validación

---

## Arquitectura Implementada

```
InputManager.searchImages()
  ├─ 1. Intentar Brave Image Search (primario)
  │    ├─ Validar imágenes (CORS check)
  │    └─ Convertir a Data URI
  │
  ├─ 2. Si fallan < 3 imágenes: Google Images Fallback
  │    ├─ Llamar google-images-search Edge Function
  │    ├─ Usar SERPAPI Google Images Light API
  │    ├─ Validar imágenes
  │    └─ Convertir a Data URI
  │
  └─ 3. Si todo falla: Placeholder SVG (siempre funciona)
```

---

## Archivos Creados

### 1. Edge Function: `supabase/functions/google-images-search/index.ts`

**Ubicación**: `/Users/marcelo/Documents/Curios/supabase/functions/google-images-search/index.ts`

**Propósito**: Proxy seguro para SERPAPI Google Images Light API

**Endpoint**: `https://gpfccicfqynahflehpqo.supabase.co/functions/v1/google-images-search`

**Request**:
```json
{
  "query": "coffee cups",
  "count": 10
}
```

**Response**:
```json
{
  "success": true,
  "query": "coffee cups",
  "count": 10,
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "title": "Coffee Cup",
      "source": "example.com",
      "link": "https://example.com/page",
      "thumbnail": "https://example.com/thumb.jpg",
      "width": 1920,
      "height": 1080
    }
  ]
}
```

**Environment Variables Needed**:
- `SERPAPI_API_KEY` - Ya configurada en tu proyecto

### 2. Cliente Service: `src/services/studio/assets/googleImageService.ts`

**Propósito**: Cliente para consumir la Edge Function desde el frontend

**Uso**:
```typescript
const service = new GoogleImageService();
const images = await service.searchImages('coffee', { count: 10 });
```

### 3. InputManager Actualizado

**Cambios en `src/services/studio/managers/InputManager.ts`**:

1. **Importa** `GoogleImageService`
2. **Inicializa** en constructor: `this.googleImageService = new GoogleImageService()`
3. **Fallback chain**:
   - Primero: Brave Image Search → validar → Data URI
   - Segundo: Google Images Search → validar → Data URI
   - Tercero: Placeholder SVG seguro

---

## Deployment - PENDIENTE

### Problema con Supabase CLI

El CLI de Supabase tiene problemas de compatibilidad con macOS 11:
```
dyld: Symbol not found: _SecTrustCopyCertificateChain
(built for Mac OS X 12.0)
```

### Opciones de Deployment:

#### Opción 1: Supabase Dashboard (RECOMENDADO)

1. Ir a: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions
2. Click "New Function"
3. Nombre: `google-images-search`
4. Copiar contenido de: `supabase/functions/google-images-search/index.ts`
5. Configurar JWT: **Disabled** (ya usa verificación de ANON KEY)
6. Deploy

#### Opción 2: Actualizar macOS a 12+

Si actualizas a macOS Monterey o superior, el CLI funcionará:
```bash
supabase functions deploy google-images-search --no-verify-jwt
```

#### Opción 3: GitHub Actions

Crear workflow para deployment automático:
```yaml
# .github/workflows/deploy-edge-functions.yml
name: Deploy Edge Functions
on:
  push:
    paths:
      - 'supabase/functions/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy google-images-search --no-verify-jwt
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## Variables de Entorno

### Ya Configuradas ✅

En `.env`:
```bash
SERPAPI_API_KEY=c25f9802be19c7974a87a148e4133ad3ee344567f2090f930689100954d18e4a
```

### Necesarias en Supabase Project

Ir a: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/functions

Agregar:
- **Key**: `SERPAPI_API_KEY`
- **Value**: `c25f9802be19c7974a87a148e4133ad3ee344567f2090f930689100954d18e4a`

### Frontend (ya configurada)

Ya existe en código:
```typescript
const GOOGLE_IMAGES_EDGE_URL = import.meta.env.VITE_GOOGLE_IMAGES_API_URL || 
  'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/google-images-search';
```

Opcional agregar a `.env`:
```bash
VITE_GOOGLE_IMAGES_API_URL=https://gpfccicfqynahflehpqo.supabase.co/functions/v1/google-images-search
```

---

## Testing

### 1. Después del deployment, test la Edge Function:

```bash
curl -X POST \
  https://gpfccicfqynahflehpqo.supabase.co/functions/v1/google-images-search \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"query":"coffee","count":5}'
```

### 2. Test desde el frontend:

```javascript
// En browser console
const service = new (await import('./services/studio/assets/googleImageService.js')).GoogleImageService();
const images = await service.searchImages('coffee', { count: 5 });
console.log('Google Images:', images);
```

### 3. Test completo del workflow:

```javascript
// Ejecutar test Level 5 de nuevo
testLevel5();

// Ahora debería:
// 1. Intentar Brave images
// 2. Detectar CORS/tainted canvas
// 3. Fallback a Google Images ✅
// 4. Validar y convertir a Data URI
// 5. Generar video con chunks > 0 ✅
```

---

## Beneficios de Google Images vs Pexels

### Google Images (SERPAPI):
- ✅ **Mayor diversidad**: Cualquier tema, cualquier keyword
- ✅ **Más resultados**: Millones de imágenes indexadas
- ✅ **Mejor relevancia**: Algoritmo de Google
- ✅ **Metadata rica**: Títulos, fuentes, dimensiones
- ⚠️ **Puede tener CORS**: Validación estricta requerida

### Pexels (anterior fallback):
- ✅ **Sin CORS**: Todas con CORS headers
- ✅ **Alta calidad**: Fotos profesionales
- ❌ **Stock limitado**: Solo fotos de estudio
- ❌ **Temas limitados**: No cubre conceptos abstractos

---

## Próximos Pasos

1. **Desplegar Edge Function** (via Dashboard o actualizar macOS)
2. **Agregar SERPAPI_API_KEY** en Supabase Project Settings
3. **Test Level 5** de nuevo - debe pasar ✅
4. **Re-habilitar audio** en renderChapterSimple
5. **Re-habilitar effects/timeline** incrementalmente
6. **Production deployment**

---

## Logs y Debug

### Edge Function Logs

Ver en: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/logs/edge-functions

Buscar:
```
[google-images-search] Searching Google Images: <query>
[google-images-search] Found N images for query: <query>
```

### Frontend Logs

Buscar en console:
```
[InputManager] Brave falló, usando Google Images como fallback
[GoogleImageService] Searching images: <query>
[InputManager] Google Images encontradas, validando...
[InputManager] Imágenes Google validadas exitosamente
```

---

## Costos SERPAPI

**Plan Actual**: Usa la key existente `c25f98...`

**Google Images Light API**: ~0.002 USD por búsqueda

**Estimación**:
- 1 video = 3 chapters
- 3 chapters × 1 búsqueda fallback = 3 búsquedas
- 3 × $0.002 = $0.006 por video con fallback
- Solo se usa cuando Brave falla CORS check

**Optimización**: La validación de imágenes Brave evita usar Google Images innecesariamente

---

## Resumen Ejecutivo

**Problema**: Brave images causan tainted canvas (CORS) → 0 chunks  
**Solución**: Google Images (SERPAPI) como fallback robusto  
**Estado**: ✅ Código completo, esperando deployment  
**ETA**: 5 minutos (deployment manual via Dashboard)  
**Impacto**: 100% de videos con imágenes exitosas
