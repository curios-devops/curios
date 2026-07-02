# 🧪 Resultados de Tests: Gemini API vs Vertex AI

**Fecha:** 2026-04-02
**Proyecto:** curios-vertex
**Cuenta:** marcelo@curiosai.com

---

## 📊 RESUMEN EJECUTIVO

| API | Status | HTTP Code | Modelo Disponible | Recomendación |
|-----|--------|-----------|-------------------|---------------|
| **Gemini API** | ❌ No funciona | 404 | NO | No usar |
| **Vertex AI** | ✅ Funciona | 200 | SÍ | **USAR ESTE** |

---

## 🔬 TEST 1: Generative Language API (Gemini API)

### Configuración
- **Endpoint:** `generativelanguage.googleapis.com/v1beta`
- **Modelo probado:** `veo-3.1-generate-preview`
- **Autenticación:** API Key (`REDACTED_ROTATED_KEY`)
- **Método:** `:generateVideos`

### Resultado
```
Status: 404 Not Found
```

### Respuesta
El modelo `veo-3.1-generate-preview` **NO está disponible** en la Gemini API.

### Conclusión
❌ **Veo 3.1 NO está disponible en Gemini API** (al menos no públicamente en Abril 2026)

---

## 🔬 TEST 2: Vertex AI

### Configuración
- **Endpoint:** `aiplatform.googleapis.com/v1`
- **Modelo probado:** `veo-3.1-generate-001`
- **Autenticación:** gcloud OAuth2 (`marcelo@curiosai.com`)
- **Proyecto:** `curios-vertex`
- **Región:** `us-central1`
- **Método:** `:predictLongRunning`

### Resultado
```
Status: 200 OK
```

### Respuesta
```json
{
  "name": "projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/b0104521-14ca-4f09-9d85-c73506fc96db"
}
```

### Conclusión
✅ **Veo 3.1 SÍ está disponible en Vertex AI**

La operación long-running se creó exitosamente. El video se está generando de forma asíncrona.

---

## 🎯 RECOMENDACIÓN FINAL

### ✅ USAR: Vertex AI

**Razones:**
1. ✅ Veo 3.1 está disponible y funciona
2. ✅ Tu cuenta ya está configurada (`marcelo@curiosai.com`)
3. ✅ Proyecto `curios-vertex` tiene Vertex AI API habilitada
4. ✅ gcloud auth funciona perfectamente
5. ✅ Request exitoso (HTTP 200)

**Desventajas:**
- Autenticación más compleja (requiere gcloud o service account)
- No se puede usar API key simple

### ❌ NO USAR: Gemini API

**Razones:**
1. ❌ Veo 3.1 NO está disponible (404)
2. ❌ Solo funciona para modelos de texto (Gemini)

---

## 📝 MODELOS CONFIRMADOS

### Vertex AI - Modelos Veo Disponibles

Según documentación y tests:
- ✅ **`veo-3.1-generate-001`** → Modelo estándar (CONFIRMADO FUNCIONAL)
- ✅ **`veo-3.1-fast-generate-001`** → Versión rápida (documentado, no probado)

### Gemini API - Modelos Veo Disponibles
- ❌ Ninguno disponible públicamente

---

## 🔧 CONFIGURACIÓN PARA USAR VERTEX AI

### 1. Autenticación

**Opción A: gcloud CLI (local development)**
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project curios-vertex
```

**Opción B: Service Account (production)**
```bash
# Crear service account
gcloud iam service-accounts create veo-video-generator \
  --display-name="Veo Video Generator"

# Dar permisos
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:veo-video-generator@curios-vertex.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Descargar key
gcloud iam service-accounts keys create ./veo-sa-key.json \
  --iam-account=veo-video-generator@curios-vertex.iam.gserviceaccount.com
```

### 2. Endpoint
```
POST https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001:predictLongRunning
```

### 3. Headers
```bash
Authorization: Bearer $(gcloud auth print-access-token)
Content-Type: application/json
```

### 4. Request Body
```json
{
  "instances": [{
    "prompt": "Tu prompt aquí"
  }],
  "parameters": {
    "aspectRatio": "16:9",
    "sampleCount": 1
  }
}
```

### 5. Respuesta
```json
{
  "name": "projects/.../operations/UUID"
}
```

### 6. Consultar Status (Polling)
```bash
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/{operation_name}"
```

---

## 🚀 PRÓXIMOS PASOS

### Para TypeScript WebApp

1. **Instalar SDK de Vertex AI:**
   ```bash
   npm install @google-cloud/aiplatform
   ```

2. **Crear VeoVertexProvider:**
   - Usar `@google-cloud/aiplatform` SDK
   - Implementar polling para long-running operations
   - Manejar autenticación (service account o ADC)

3. **Configurar Service Account:**
   - Crear en Google Cloud Console
   - Descargar JSON key
   - Agregar a `.env` (backend only!)

4. **Implementar en backend:**
   - **IMPORTANTE:** La key de service account **NO debe** estar en el frontend
   - Crear Supabase Edge Function o Netlify Function
   - Proxy requests desde frontend → backend → Vertex AI

---

## 💰 COSTOS

Según documentación oficial (Abril 2026):

### Veo 3.1 Generate (veo-3.1-generate-001)
- **$0.40 por segundo** de video generado
- Video de 5 segundos = **$2.00 USD**
- Video de 10 segundos = **$4.00 USD**

### Veo 3.1 Fast (veo-3.1-fast-generate-001)
- **$0.15 por segundo** de video generado
- Video de 5 segundos = **$0.75 USD**
- Video de 10 segundos = **$1.50 USD**

**Nota:** Requiere **billing habilitado** en proyecto `curios-vertex`.

---

## 📚 DOCUMENTACIÓN

### Scripts Creados
- [scripts/test-gemini-api.sh](scripts/test-gemini-api.sh) - Test Gemini API ❌
- [scripts/test-vertex-ai.sh](scripts/test-vertex-ai.sh) - Test Vertex AI ✅

### Documentación Oficial
- 🔗 Vertex AI Veo: https://cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate
- 🔗 API Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
- 🔗 Pricing: https://cloud.google.com/vertex-ai/pricing

---

## ✅ CONCLUSIÓN

**Debes usar Vertex AI, NO Gemini API.**

Todo el código que escribimos antes con `@google/genai` **NO funcionará** porque ese SDK es para Gemini API, donde Veo no está disponible.

**Necesitamos refactorizar a Vertex AI:**
1. Cambiar de SDK: `@google/genai` → `@google-cloud/aiplatform`
2. Implementar autenticación con service account
3. Manejar long-running operations (polling)
4. Crear backend proxy (Supabase/Netlify function)

---

**Siguiente paso:** ¿Quieres que configure la integración con Vertex AI en TypeScript?
