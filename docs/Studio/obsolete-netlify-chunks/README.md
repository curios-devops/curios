# Estrategias Obsoletas - Netlify Chunks & Rendering

## ⚠️ Archivos Históricos - NO USAR

Esta carpeta contiene documentación de intentos fallidos de rendering de video usando **Netlify Functions** con estrategia de chunks.

## ¿Por qué están aquí?

Estos archivos documentan múltiples intentos de optimización para hacer que el rendering de video funcione dentro del límite de **26 segundos** de Netlify Functions (free tier):

- ❌ Chunks de 1-5 segundos
- ❌ Reducción de resolución a 720p
- ❌ Reducción de FPS a 15
- ❌ Pre-bundling de Remotion
- ❌ Optimización de Chrome/Chromium
- ❌ Puppeteer integration
- ❌ Varios fixes de timeouts

## Conclusión Final

**Netlify Functions es fundamentalmente demasiado lento** para rendering de video:
- Frame 0 solo tomaba 30+ segundos
- Incluso 15 frames (1 segundo) excedían el timeout
- El ambiente serverless no tiene suficiente CPU/memoria para Chromium + Remotion

## Solución Correcta

Para rendering de video en producción se necesita:
- **@remotion/lambda** (AWS Lambda con configuración optimizada)
- O un servidor dedicado con más recursos
- Costo estimado: $0.01-0.05 por video

## Archivos en esta carpeta

Todos estos documentos son **obsoletos** y están aquí solo como referencia histórica:

- `MACOS_11_*.md` - Problemas con macOS y Chrome
- `NETLIFY_*.md` - Problemas con Netlify Functions
- `CHROME_*.md` - Intentos de optimización de Chrome
- `*_TIMEOUT_*.md` - Intentos de resolver timeouts
- `PRODUCTION_RENDERING_*.md` - Estrategias que no funcionaron
- `PHASE6_*.md` - Testing de rendering con chunks
- `*.FIX.md` - Varios fixes que no resolvieron el problema fundamental

---

**Fecha de archivo:** Febrero 2026  
**Razón:** Refactor completo de Studio sin Netlify rendering
