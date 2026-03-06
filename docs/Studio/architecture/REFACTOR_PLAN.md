# 🎬 Studio Refactor - Plan de Acción

## ✅ Fase 1: Organización Completada

### Lo que se hizo:
1. **Root limpio** - Solo 2 archivos MD (README.md, MYRUN.md)
2. **30 archivos obsoletos archivados** en `docs/Studio/obsolete-netlify-chunks/`
3. **Archivos de Puppeteer eliminados** (no se van a usar)
4. **Tests organizados** en `docs/testing/`
5. **Guías centralizadas** en `docs/guides/`
6. **Migraciones organizadas** en `docs/migrations/`

### Estructura docs/Studio:
```
docs/Studio/
├── README.md                           # Introducción y estado actual
├── PRODUCTION_DEPLOYMENT_PLAN.md       # Plan de deployment
├── PRODUCTION_READY_SUMMARY.md         # Resumen de producción
└── obsolete-netlify-chunks/            # ❌ NO USAR (29 archivos)
    ├── README.md                       # Explica por qué están obsoletos
    └── [30+ archivos de intentos con Netlify/Chunks]
```

---

## 🎯 Fase 2: Refactor de Studio (AHORA)

### Contexto: ¿Por qué refactor?

**Problema fundamental con Netlify Functions:**
- Timeout de 26 segundos (free tier)
- Rendering de Frame 0 solo tomaba 30+ segundos
- Ambiente serverless demasiado lento para Chromium + Remotion
- Chunks no solucionan el problema (probamos 1-5 segundos)

**Conclusión:** Netlify Functions no es viable para video rendering

### Opciones para el Refactor

#### Opción 1: @remotion/lambda (AWS Lambda)
**Pros:**
- Optimizado específicamente para Remotion
- Configuración de memoria/CPU ajustable
- Costo razonable: $0.01-0.05 por video
- Arquitectura probada y documentada

**Contras:**
- Requiere cuenta AWS
- Configuración inicial compleja
- Costos variables según uso

#### Opción 2: Cliente-side Rendering (Navegador del Usuario)
**Pros:**
- Sin costos de servidor
- Usa recursos del usuario
- Implementación más simple

**Contras:**
- Dependiente del hardware del usuario
- Problemas en móviles/tablets
- Requiere navegador moderno
- Usuario debe esperar el rendering

#### Opción 3: Pre-renderizado de Templates
**Pros:**
- Videos instantáneos (ya renderizados)
- Sin costo de rendering en runtime
- Máxima performance

**Contras:**
- No es dinámico (solo templates fijos)
- Requiere storage para videos
- Limitado a contenido pre-definido

#### Opción 4: Servidor Dedicado
**Pros:**
- Control total
- Sin timeouts
- Optimizable al máximo

**Contras:**
- Costo mensual fijo
- Mantenimiento de servidor
- DevOps más complejo

---

## 📋 Tareas Inmediatas

### 1. Definir Arquitectura (PRIORIDAD) ✅ COMPLETADO
- [x] Decidir entre las 4 opciones → **Cliente-side Rendering (Opción 2)**
- [x] Considerar: presupuesto, volumen esperado, UX deseada
- [x] Documentar decisión en `docs/Studio/REFACTOR_PLAN.md`

### 2. Análisis de Código Actual ✅ COMPLETADO
- [x] Revisar `src/services/studio/` completo
- [x] Identificar código acoplado a Netlify Functions
- [x] Listar componentes reutilizables vs desechables
- [x] Documentar en `docs/Studio/CODE_ANALYSIS.md`

### 3. Diseño de Nueva Arquitectura ✅ COMPLETADO
- [x] Diagrama de flujo del nuevo sistema
- [x] Interfaces y contratos de API
- [x] Plan de migración gradual
- [x] Documentar en `docs/Studio/NEW_ARCHITECTURE.md`

### 4. Limpieza de Código ⏳ SIGUIENTE
- [ ] Eliminar funciones Netlify obsoletas: `render-chunk`, `render-video`
- [ ] Eliminar imports de Puppeteer
- [ ] Eliminar configuración de Chromium
- [ ] Actualizar dependencies en package.json
- [ ] Ver `docs/Studio/CODE_CLEANUP.md` para detalles

### 5. Implementación ⏳ PENDIENTE
- [ ] Implementar nueva arquitectura seleccionada
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Documentación de API

---

## 🔍 Archivos Clave a Revisar

### Código de Studio:
```
src/services/studio/
├── rendering/           # Lógica de rendering (revisar todo)
├── components/          # UI de Studio
├── scenes/              # Escenas de Remotion
└── utils/               # Utilidades
```

### Netlify Functions (a eliminar):
```
netlify/functions/
├── render-video.js      # ❌ Eliminar
└── render-chunk.js      # ❌ Eliminar
```

### Configuración:
```
remotion/               # Revisar si se mantiene o cambia
package.json            # Actualizar dependencies
netlify.toml            # Remover functions obsoletas
```

---

## ⚠️ No Hacer

1. **NO reintentar optimizaciones de Netlify + Chunks**
   - Ya se probaron 15+ estrategias diferentes
   - El problema es fundamental, no de optimización

2. **NO usar código de `obsolete-netlify-chunks/`**
   - Está ahí solo como referencia histórica
   - Toda esa estrategia está descartada

3. **NO mantener Puppeteer**
   - Ya se eliminó, no reintroducir

---

## 📊 Métricas de Éxito

El refactor será exitoso cuando:
- ✅ Videos se generan completamente (no se cortan)
- ✅ Tiempo de generación < 2 minutos (target)
- ✅ Costo por video ≤ $0.10 (si aplica)
- ✅ UX no se degrada (loading states claros)
- ✅ Código mantenible y documentado
- ✅ Tests pasan al 100%

---

## 💡 Recomendación Personal

**Mi recomendación: Cliente-side Rendering (Opción 2)**

**Razones:**
1. **Sin costos** - Aprovecha recursos del usuario
2. **Más simple** - No requiere infraestructura compleja
3. **Remotion soporta cliente-side** - Ya está diseñado para eso
4. **Fallback posible** - Si el navegador no soporta, mostrar mensaje
5. **Rápido de implementar** - Días, no semanas

**Implementación sugerida:**
```typescript
// Detectar capacidades del navegador
if (canRenderClientSide()) {
  // Renderizar en navegador con Remotion Player
  renderInBrowser(composition);
} else {
  // Fallback: mostrar mensaje o pre-renderizado
  showFallback();
}
```

**Consideraciones:**
- Para móviles: pre-renderizar versión ligera
- Para desktop: rendering completo en navegador
- Progressive enhancement: mejor experiencia en mejor hardware

---

**Fecha:** Febrero 7, 2026  
**Estado:** Fase 2 en progreso - Documentación completada  
**Próximo:** Ejecutar limpieza de código (CODE_CLEANUP.md)

---

## 📚 Documentación Completa

### Fase 1: Planificación ✅
- **REFACTOR_PLAN.md** (este archivo) - Plan general y decisiones
- **RefactorVideo** - Especificación técnica del sistema de chapters

### Fase 2: Análisis y Diseño ✅
- **CODE_ANALYSIS.md** - Análisis completo del código actual (90% reutilizable)
- **NEW_ARCHITECTURE.md** - Diseño detallado de la arquitectura client-side
- **CODE_CLEANUP.md** - Plan de limpieza de archivos obsoletos

### Fase 3: Implementación ⏳
- **IMPLEMENTATION.md** - Guía paso a paso de implementación (próximo)

### Referencia:
- **obsolete-netlify-chunks/** - Código histórico archivado (NO USAR)
