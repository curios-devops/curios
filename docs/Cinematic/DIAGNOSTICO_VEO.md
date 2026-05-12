# 🔍 Diagnóstico de Conexión a Veo 3.1

## ✅ PROGRESO ACTUAL

### 1. API Key ✅ CORRECTA
- **Status:** ✅ Válida
- **Key:** `AIzaSyCTCY0RvSt...`
- **Formato:** Correcto (empieza con `AIzaSy`)

### 2. SDK instalado ✅
- `@google/genai@1.48.0` ✅

### 3. Código actualizado ✅
- [VeoProvider.ts](src/services/cinematic/providers/VeoProvider.ts) usa `veo-3.1-generate-preview` ✅
- [env.ts](src/config/env.ts) exporta `google.aiApiKey` ✅

---

## ❌ PROBLEMAS IDENTIFICADOS

### Error 429: Rate Limit Excedido
```
You exceeded your current quota, please check your plan and billing details
```

**Causas posibles:**
1. Has usado mucho Gemini hoy (cuota gratis agotada)
2. Tu proyecto de Google Cloud no tiene billing habilitado
3. Veo requiere un plan de pago (no está en free tier)

---

## 🎯 SIGUIENTE PASO: Verificar Acceso a Veo

### Opción 1: Verificar en Google AI Studio
1. Ve a: https://aistudio.google.com/
2. Busca en el menú lateral **"Veo"** o **"Video generation"**
3. Si aparece: Tienes acceso ✅
4. Si NO aparece: Necesitas habilitar acceso ❌

### Opción 2: Verificar Quota en Google Cloud Console
1. Ve a: https://console.cloud.google.com/
2. Busca tu proyecto asociado a la API key
3. Ve a **"APIs & Services" > "Enabled APIs"**
4. Busca **"Generative Language API"** o **"Vertex AI API"**
5. Click en **"Quotas & System Limits"**
6. Verifica:
   - ¿Tienes quota disponible?
   - ¿Está habilitado billing?

### Opción 3: Usar una API Key Nueva
Si tu key actual tiene quota agotada:
1. Ve a: https://aistudio.google.com/apikey
2. Crea una nueva API key
3. Actualiza `.env`:
   ```bash
   VITE_GOOGLE_AI_API_KEY=TU_NUEVA_KEY_AQUI
   ```

---

## 🚨 IMPORTANTE: Veo 3.1 Está en Paid Preview

Según la documentación oficial (Marzo 2026):

### Veo 3.1 NO está en el Free Tier
- **Veo 3.1 Generate Preview** requiere **billing habilitado**
- Costo estimado: **$0.80 por segundo de video**
- Video de 5 segundos = ~$4.00 USD

### Para usar Veo necesitas:
1. ✅ API key válida de Google AI
2. ✅ Proyecto de Google Cloud con **billing habilitado**
3. ✅ Aplicar para acceso a Veo (si aún está en preview cerrado)

---

## 📋 CHECKLIST DE CONFIGURACIÓN

- [x] SDK `@google/genai` instalado
- [x] API key válida (formato correcto)
- [x] Código actualizado con modelo correcto
- [ ] Quota disponible / Billing habilitado
- [ ] Acceso a Veo confirmado en Google AI Studio
- [ ] Test exitoso en terminal

---

## 🔧 TROUBLESHOOTING

### Si sigues con Error 429:

#### A. Espera 24 horas
La cuota gratuita de Gemini se resetea diariamente.

#### B. Habilita Billing
1. Ve a: https://console.cloud.google.com/billing
2. Asocia una tarjeta de crédito
3. Habilita billing en tu proyecto
4. Espera ~5 minutos y reintenta

#### C. Verifica uso actual
1. Ve a: https://ai.dev/rate-limit
2. Revisa cuánto has usado hoy
3. Si es cuota diaria: Espera reset
4. Si es cuota mensual: Upgrade a plan de pago

### Si Error "Method not found" o "Model not available":

Veo puede NO estar disponible aún para tu región/cuenta.

**Alternativas:**
1. Usar otro proveedor de video (Runway, Luma, etc.)
2. Esperar a disponibilidad general de Veo
3. Aplicar para early access en: https://labs.google/fx/tools/video-fx

---

## 🎬 PRÓXIMO TEST

Una vez que tengas quota disponible, ejecuta:

```bash
node scripts/test-veo.mjs
```

**Si funciona, verás:**
```
✅ ¡VIDEO GENERADO CON ÉXITO!
⏱️  Tiempo total: 120 segundos
📹 Video URI: https://generativelanguage.googleapis.com/...
```

---

## 📚 Enlaces Útiles

- 🔑 API Keys: https://aistudio.google.com/apikey
- 📊 Quotas: https://ai.dev/rate-limit
- 💳 Billing: https://console.cloud.google.com/billing
- 📖 Docs Veo: https://ai.google.dev/gemini-api/docs/video
- 💰 Pricing: https://ai.google.dev/pricing

---

## 🚀 Estado del Proyecto

**Fecha:** 2026-04-02
**Status:** ⚠️ Configuración completa, esperando quota/billing

### Para Continuar:
1. Habilita billing en Google Cloud Console
2. Espera 24h si quota agotada
3. Ejecuta `node scripts/test-veo.mjs`
4. Si funciona → Integra en webapp
5. Si falla → Revisa acceso a Veo en AI Studio
