# Studio - Video Generation System

## 📁 Estructura de Documentación

Esta carpeta contiene toda la documentación relacionada con el sistema de generación de videos (Studio) de CuriosAI.

### Carpetas

- **`obsolete-netlify-chunks/`** - Estrategias obsoletas de rendering con Netlify Functions y chunks (NO USAR)

### Documentos Principales

- **`PRODUCTION_DEPLOYMENT_PLAN.md`** - Plan de deployment para producción
- **`PRODUCTION_READY_SUMMARY.md`** - Resumen del estado de producción

## 🎯 Estado Actual (Febrero 2026)

### ❌ Lo que NO funciona

**Netlify Functions + Chunks:**
- Intentamos múltiples estrategias para hacer rendering en Netlify Functions
- Problema fundamental: 26 segundos de timeout son insuficientes
- Frame 0 solo tomaba 30+ segundos en ambiente serverless
- Ver `obsolete-netlify-chunks/` para detalles históricos

### ✅ Próximos Pasos

**Refactor Completo de Studio:**
1. Eliminar dependencia de Netlify Functions para rendering
2. Considerar alternativas:
   - @remotion/lambda (AWS Lambda optimizado)
   - Servidor dedicado
   - Cliente-side rendering (navegador del usuario)
   - Pre-renderizado de templates

## 📝 Notas de Desarrollo

- Los archivos en `obsolete-netlify-chunks/` se mantienen solo como referencia histórica
- No reintentar estrategias documentadas en carpeta obsolete
- Para nuevo desarrollo de Studio, empezar desde cero sin Netlify Functions

---

**Última actualización:** Febrero 7, 2026  
**Mantenedor:** CuriosAI Dev Team
