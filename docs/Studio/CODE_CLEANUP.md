# 🧹 Limpieza de Código - Eliminar Obsoletos

**Fecha:** Febrero 7, 2026  
**Objetivo:** Eliminar código acoplado a Netlify Functions y estrategia de chunks  
**Antes de:** Implementar nueva arquitectura client-side

---

## ⚠️ IMPORTANTE: Backup Primero

Antes de eliminar, vamos a hacer commit del estado actual:

```bash
git add -A
git commit -m "📸 Snapshot antes de limpieza Studio - eliminación de Netlify rendering"
git push origin main
```

---

## 🗑️ Archivos a ELIMINAR

### 1. Netlify Functions (2 archivos)

#### ❌ `netlify/functions/render-chunk.js`
**Tamaño:** 10,094 bytes  
**Razón:** Renderiza chunks en Netlify (obsoleto, no funciona)  
**Dependencias:** Ninguna en codebase actual

**Comando:**
```bash
rm netlify/functions/render-chunk.js
```

#### ❌ `netlify/functions/render-video.mjs`
**Tamaño:** 3,830 bytes  
**Razón:** Renderiza video completo en Netlify (obsoleto)  
**Dependencias:** Ninguna en codebase actual

**Comando:**
```bash
rm netlify/functions/render-video.mjs
```

---

### 2. Rendering Module Obsoleto (2 archivos)

#### ❌ `src/services/studio/rendering/chunkedRenderer.ts`
**Tamaño:** 474 líneas  
**Razón:** Lógica para renderizar chunks vía Netlify  
**Dependencias:** Usado en `videoRenderer.ts` (que será refactorizado)

**Qué hace:**
- Gestiona rendering paralelo de chunks
- Llama a Netlify Functions
- Track de estados de chunks
- Progress callbacks

**Acción:**
```bash
# Mover a obsolete primero (por si acaso)
mv src/services/studio/rendering/chunkedRenderer.ts \
   docs/Studio/obsolete-netlify-chunks/chunkedRenderer.ts.backup
```

#### ❌ `src/services/studio/rendering/chunkPlanner.ts`
**Tamaño:** ~200 líneas (estimado)  
**Razón:** Planifica división en chunks para Netlify  
**Dependencias:** Usado en `chunkedRenderer.ts`

**Qué hace:**
- Divide video en chunks de N segundos
- Calcula overlaps
- Genera metadata de chunks

**Acción:**
```bash
# Mover a obsolete primero
mv src/services/studio/rendering/chunkPlanner.ts \
   docs/Studio/obsolete-netlify-chunks/chunkPlanner.ts.backup
```

---

## 🔄 Archivos a REFACTOR (no eliminar)

### ⚠️ `src/services/studio/agents/videoRenderer.ts`

**NO ELIMINAR** - Solo refactorizar completamente.

**Cambios necesarios:**

#### Antes (estado actual):
```typescript
/**
 * Video Renderer Service (Client-side)
 * PREVIEW MODE: Simulates rendering for development
 * TODO: Implement actual server-side rendering
 */

const PREVIEW_MODE = true; // Set to false when server rendering is ready

export class VideoRendererAgent {
  async renderVideo(
    scenes: SceneStructure,
    format: 'vertical' | 'horizontal',
    videoId: string,
    accentColor: string = '#3b82f6',
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (PREVIEW_MODE) {
      return this.generatePreview(scenes, format, videoId, accentColor, onProgress);
    }
    throw new Error('Server-side rendering not yet implemented');
  }

  private async generatePreview(/* ... */): Promise<string> {
    // Simula rendering con delays
  }
}
```

#### Después (nueva implementación):
```typescript
/**
 * Video Renderer Agent
 * Coordinates chapter rendering client-side
 */

import { ChapterRenderer } from '../rendering/ChapterRenderer';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { InputManager } from '../managers/InputManager';

export class VideoRendererAgent {
  private chapterRenderer: ChapterRenderer;
  private backgroundRenderer: BackgroundRenderer;
  private inputManager: InputManager;
  
  constructor() {
    this.chapterRenderer = new ChapterRenderer();
    this.backgroundRenderer = new BackgroundRenderer();
    this.inputManager = new InputManager();
  }
  
  async renderVideo(
    chapterPlan: ChapterPlan,
    videoId: string,
    onProgress?: (progress: number) => void
  ): Promise<string[]> {
    // 1. Preparar chapters con Input Manager
    const descriptors = await this.inputManager.prepareChapters(chapterPlan);
    
    // 2. Iniciar background rendering
    const chapterUrls = await this.backgroundRenderer.startBackgroundRendering(
      descriptors,
      videoId,
      onProgress
    );
    
    // 3. Retornar URLs de todos los chapters
    return chapterUrls;
  }
}
```

**Acción:**
```bash
# Crear backup
cp src/services/studio/agents/videoRenderer.ts \
   src/services/studio/agents/videoRenderer.ts.backup

# Luego refactorizar el archivo
```

---

## 📝 Imports a Actualizar

### Archivos que importan `chunkedRenderer`:

```bash
# Buscar referencias
grep -r "chunkedRenderer" src/services/studio/
```

**Probables archivos afectados:**
- `src/services/studio/agents/videoRenderer.ts` ✅ (será refactorizado)
- `src/services/studio/agents/controller.ts` ⚠️ (verificar)
- `src/services/studio/agents/orchestrator.ts` ⚠️ (verificar)

**Acción:**
1. Buscar todos los imports
2. Reemplazar con nuevos módulos
3. Actualizar llamadas a métodos

---

## 🔧 Configuración a Actualizar

### `netlify.toml`

**Remover funciones obsoletas:**

#### Antes:
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/render-chunk"
  to = "/.netlify/functions/render-chunk"
  status = 200

[[redirects]]
  from = "/api/render-video"
  to = "/.netlify/functions/render-video"
  status = 200
```

#### Después:
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

# Render functions removed - now using client-side rendering
# Only keep other functions (social-share, etc.)

[[redirects]]
  from = "/api/social-share"
  to = "/.netlify/functions/social-share"
  status = 200
# ... otras funciones
```

---

### `package.json`

**Remover dependencies obsoletas:**

#### Verificar y remover (si no se usan en otro lado):
```json
{
  "dependencies": {
    // Verificar si estos se usan solo para Netlify rendering:
    "@sparticuz/chromium": "...",  // ❌ Solo para Puppeteer/Chromium
    "puppeteer-core": "...",       // ❌ Solo para Netlify
    "@remotion/bundler": "...",    // ⚠️ Verificar si se usa
    "@remotion/renderer": "...",   // ⚠️ Verificar si se usa
  }
}
```

**Comando para verificar uso:**
```bash
# Buscar imports de estas librerías
grep -r "@sparticuz/chromium" src/
grep -r "puppeteer" src/
```

**Si no se usan:**
```bash
npm uninstall @sparticuz/chromium puppeteer-core
```

---

### Variables de Entorno (`.env`)

**Remover variables obsoletas:**

#### Verificar y comentar:
```bash
# Obsolete - Netlify rendering removed
# VITE_ENABLE_PRODUCTION_RENDERING=false
# NETLIFY_RENDER_TIMEOUT=26000
```

---

## 📋 Checklist de Limpieza

### Paso 1: Backup
- [ ] Commit estado actual
- [ ] Push a GitHub
- [ ] Tag como `pre-studio-refactor`

### Paso 2: Eliminar Netlify Functions
- [ ] `rm netlify/functions/render-chunk.js`
- [ ] `rm netlify/functions/render-video.mjs`
- [ ] Verificar que no rompió nada: `npm run build`

### Paso 3: Archivar Rendering Obsoleto
- [ ] Mover `chunkedRenderer.ts` a obsolete
- [ ] Mover `chunkPlanner.ts` a obsolete
- [ ] Commit: "Archive obsolete chunk rendering modules"

### Paso 4: Buscar Referencias
- [ ] `grep -r "chunkedRenderer" src/`
- [ ] `grep -r "chunkPlanner" src/`
- [ ] Documentar archivos afectados

### Paso 5: Actualizar Configuración
- [ ] Limpiar `netlify.toml`
- [ ] Verificar `package.json` dependencies
- [ ] Comentar env vars obsoletas
- [ ] Commit: "Clean Netlify config - remove render functions"

### Paso 6: Preparar Refactor
- [ ] Backup `videoRenderer.ts`
- [ ] Crear estructura de nuevos archivos:
  ```
  src/services/studio/
  ├── managers/
  │   └── InputManager.ts         (nuevo)
  ├── rendering/
  │   ├── ChapterRenderer.ts      (nuevo)
  │   └── BackgroundRenderer.ts   (nuevo)
  ```

### Paso 7: Verificación
- [ ] `npm run build` - debe compilar
- [ ] `npm run dev` - debe levantar
- [ ] No debe haber errores de imports

---

## 🧪 Testing Durante Limpieza

Después de cada paso, verificar:

```bash
# Build debe pasar
npm run build

# Dev server debe levantar
npm run dev

# Buscar errores de imports
grep -r "from.*chunkedRenderer" src/
grep -r "from.*chunkPlanner" src/
```

---

## ⏭️ Después de la Limpieza

Una vez completada la limpieza:

1. **Commit final de limpieza:**
```bash
git add -A
git commit -m "🧹 Studio cleanup complete - removed Netlify rendering

- Deleted render-chunk.js and render-video.mjs (Netlify functions)
- Archived chunkedRenderer.ts and chunkPlanner.ts
- Updated netlify.toml (removed render function redirects)
- Cleaned package.json dependencies
- Ready for client-side chapter rendering implementation"
git push origin main
```

2. **Crear branch para implementación:**
```bash
git checkout -b feature/studio-client-side-rendering
```

3. **Continuar con Tarea 5: Implementación**

---

## 📝 Notas Importantes

### ⚠️ Si algo sale mal:

**Revertir a snapshot:**
```bash
git reset --hard HEAD~1  # Volver al commit anterior
```

**O revertir commit específico:**
```bash
git revert <commit-hash>
```

### ✅ Señales de que todo está bien:

- ✅ `npm run build` compila sin errores
- ✅ `npm run dev` levanta sin errores
- ✅ No hay imports rotos en consola
- ✅ Studio page carga (aunque no renderice aún)

---

**Estado:** Listo para ejecutar  
**Tiempo estimado:** 30-60 minutos  
**Riesgo:** Bajo (tenemos backups)  
**Próximo:** Implementación de nueva arquitectura

---

**Siguiente documento:** `IMPLEMENTATION.md`
