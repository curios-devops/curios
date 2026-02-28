# 📁 Reorganización de Documentación - Febrero 2026

## Resumen de Cambios

Se realizó una limpieza completa del directorio root moviendo toda la documentación dispersa a la carpeta `docs/` con una estructura organizada.

## ✅ Root Directory (Limpio)

Solo quedaron en el root:
- `README.md` - Documentación principal del proyecto
- `MYRUN.md` - Guía de comandos rápidos
- Archivos de configuración (package.json, tsconfig, etc.)
- Carpetas principales (src/, docs/, public/, etc.)

## 📂 Nueva Estructura de Documentación

### `docs/Studio/`
Documentación del sistema de generación de videos:
- `README.md` - Introducción y estado actual
- `PRODUCTION_DEPLOYMENT_PLAN.md`
- `PRODUCTION_READY_SUMMARY.md`
- `obsolete-netlify-chunks/` - **Estrategias obsoletas archivadas** (NO USAR)
  - 30+ archivos de intentos fallidos con Netlify Functions + Chunks
  - Incluye README explicando por qué no funcionaron

### `docs/guides/`
Guías generales movidas desde root:
- `Stripe_guide.md` ← `Stripe_guide.md` (root)
- `TAVILY_GUIDE.md` ← `TAVILY_GUIDE.md` (root)
- Plus guías existentes (AGENTS.md, MCP.md, etc.)

### `docs/migrations/`
Scripts y guías de migración:
- `MIGRATION_STEPS.md` ← `MIGRATION_STEPS.md` (root)
- `RUN_MIGRATION.md` ← `RUN_MIGRATION.md` (root)

### `docs/testing/`
Archivos de test y debug movidos desde root:
- `debug-click-blocking.js`
- `debug-env.html`
- `test-function.js`
- `test-shopping-components.html`
- `test-shopping-intent.html`
- `create-og-image.html`
- `local-openai-function.js`

### `docs/fixes/`
Ya existía, se agregó:
- `RATE_LIMIT_FIX.md` ← `RATE_LIMIT_FIX.md` (root)

### `docs/ToDo/`
Listas de tareas pendientes:
- `ToDo_Image.md` ← `ToDo_Image.md` (root)
- `ToDo_image_HD.md` ← `ToDo_image_HD.md` (root)

### `scripts/`
Scripts de utilidades:
- `fresh-start.sh` ← `fresh-start.sh` (root)
- Plus scripts existentes

## 🗑️ Archivos Eliminados

Se eliminaron archivos obsoletos relacionados con Puppeteer:
- `PUPPETEER_CHROME_TIMEOUT_FIX.md`
- `PUPPETEER_INTEGRATION_COMPLETE.md`

**Razón:** Puppeteer no se va a usar, los intentos con Netlify Functions fueron abandonados.

## 📋 Archivos Movidos a Archive (obsolete-netlify-chunks/)

Total: **30 archivos** de estrategias fallidas con Netlify + Chunks:

### Problemas de Chrome/Browser:
- `BROWSER_CACHE_FIX.md`
- `CHROME_FLAG_FORMAT_FIX.md`
- `CHROME_HEADLESS_NEW_TIMEOUT_FIX.md`
- `CHROME_NEW_HEADLESS_FIX.md`
- `CHROME_TIMEOUT_COMPOSITION_FIX.md`
- `CLEAN_CHROME_DOWNLOAD_FIX.md`
- `USE_REMOTION_CHROME_FIX.md`

### Problemas de Netlify:
- `NETLIFY_FUNCTION_PATH_FIX.md`
- `NETLIFY_FUNCTION_PATH_RESOLVED.md`
- `NETLIFY_V1_V2_FIX.md`

### Problemas de macOS:
- `MACOS_11_FINAL_ANALYSIS.md`
- `MACOS_11_SYSTEM_CHROME_FIX.md`

### Intentos de Optimización:
- `OPTIMIZATION_APPLIED.md`
- `FREE_TIER_COMPLETE.md`
- `PHASE6_TESTING_COMPLETE.md`
- `PHASE6_TEST_README.md`

### Rendering Setup:
- `PRODUCTION_RENDERING_SETUP.md`
- `PRUEBA_FINAL_PRODUCTION_RENDERING.md`

### Fixes Varios:
- `CSP_PREVIEW_MODE_FIX.md`
- `DEBUG_ERROR_500.md`
- `EXTERNAL_DEPS_FIX.md`
- `FILENAME_CONFLICT_FIX.md`
- `IGNORED_DEFAULT_ARGS_FIX.md`
- `MJS_TO_JS_FIX.md`
- `ON_BROWSER_DOWNLOAD_FIX.md`
- `REMOTION_REGISTERROOT_FIX.md`
- `RESPONSIVE_VIDEO_FIX.md`
- `RESTART_NETLIFY_SERVER.md`

## 🎯 Próximos Pasos

1. ✅ Documentación organizada
2. ⏭️ **Refactor completo de Studio** sin Netlify Functions
3. ⏭️ Evaluar alternativas para generación de videos:
   - @remotion/lambda (AWS)
   - Cliente-side rendering
   - Pre-renderizado de templates
   - Servidor dedicado

## 📝 Notas Importantes

- **NO reintentar** estrategias documentadas en `obsolete-netlify-chunks/`
- La conclusión fue clara: **Netlify Functions no puede renderizar video en 26 segundos**
- Frame 0 solo tomaba 30+ segundos en ambiente serverless
- Se necesita infraestructura diferente para video rendering

---

**Fecha:** Febrero 7, 2026  
**Razón:** Preparación para refactor completo de Studio  
**Próximo:** Diseñar nueva arquitectura sin dependencia de Netlify rendering
