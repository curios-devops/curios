# ✅ PASO 2 COMPLETADO: Supabase Edge Function Lista

**Fecha:** 2026-04-02
**Status:** ⚠️ Listo para desplegar en Dashboard

---

## 🎉 LO QUE CREAMOS

### 1. ✅ Supabase Edge Function
**Archivo:** `supabase/functions/veo-generate-video/index.ts`

**Características:**
- ✅ Autenticación con Service Account (JWT)
- ✅ Obtención de Access Token de Google OAuth2
- ✅ Generación de videos con Veo 3.1
- ✅ Consulta de status de operaciones
- ✅ Manejo de errores robusto
- ✅ CORS configurado

### 2. ✅ Cliente TypeScript para Frontend
**Archivo:** `src/services/cinematic/providers/VeoVertexProvider.ts`

**Métodos:**
- `generate(request)` → Inicia generación de video
- `checkStatus(operationName)` → Consulta status
- `generateAndWait(request, options)` → Genera y espera (con polling)
- `generateBatch(requests)` → Generación en batch
- `healthCheck()` → Verifica que la función existe

### 3. ✅ Scripts de Utilidad
- `scripts/extract-vertex-ai-secrets.sh` → Extrae secrets del JSON key
- `scripts/configure-supabase-veo-secrets.sh` → Configura secrets (requiere CLI)

### 4. ✅ Documentación
- `SUPABASE_VEO_DEPLOYMENT.md` → Guía de deployment completa
- `PASO_1_COMPLETADO.md` → Service Account setup
- `PASO_2_COMPLETADO.md` → Este archivo

---

## 📋 SECRETS EXTRAÍDOS

Los secrets están listos para copiar a Supabase Dashboard:

```bash
# Ver secrets
cat /tmp/vertex-ai-email.txt
cat /tmp/vertex-ai-private-key.txt

# Copiar al portapapeles
cat /tmp/vertex-ai-email.txt | pbcopy  # Email
cat /tmp/vertex-ai-private-key.txt | pbcopy  # Private Key
```

**Secret 1:**
```
Nombre: VERTEX_AI_SERVICE_ACCOUNT_EMAIL
Valor: veo-video-generator@curios-vertex.iam.gserviceaccount.com
```

**Secret 2:**
```
Nombre: VERTEX_AI_PRIVATE_KEY
Valor: [1703 caracteres - copiar de /tmp/vertex-ai-private-key.txt]
```

---

## 🚀 DEPLOYMENT (SIGUIENTE PASO)

### Paso A: Desplegar Función

**Ve a Supabase Dashboard:**
https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions

1. **Click en "Create a new function"**
2. **Nombre:** `veo-generate-video`
3. **Copiar código:** De `supabase/functions/veo-generate-video/index.ts`
4. **Click "Deploy function"**

### Paso B: Configurar Secrets

**Ve a Settings → Edge Functions → Secrets:**
https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/functions

1. **Click "Add secret"**
2. **Agregar Secret 1:**
   - Nombre: `VERTEX_AI_SERVICE_ACCOUNT_EMAIL`
   - Valor: `veo-video-generator@curios-vertex.iam.gserviceaccount.com`

3. **Agregar Secret 2:**
   - Nombre: `VERTEX_AI_PRIVATE_KEY`
   - Valor: Copiar de `/tmp/vertex-ai-private-key.txt`
   ```bash
   cat /tmp/vertex-ai-private-key.txt | pbcopy
   ```

### Paso C: Test con curl

```bash
# URL de tu función (después de desplegar)
FUNCTION_URL="https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNDIyMDYsImV4cCI6MjA1MDcxODIwNn0.wLnIXxThhq144sQpUFzLd_ifimgr1oetMwvchDmMF84"

# Test: Generar video
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "prompt": "A golden eagle soaring over mountains at sunrise",
    "aspectRatio": "16:9"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "operation": "projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/UUID",
  "message": "Video generation started. Use 'check' action to poll status."
}
```

---

## 💻 USO DESDE FRONTEND

### Ejemplo básico:

```typescript
import { VeoVertexProvider } from '@/services/cinematic/providers/VeoVertexProvider';

const veo = new VeoVertexProvider();

// Opción 1: Solo iniciar generación
const { operation } = await veo.generate({
  prompt: "A golden eagle soaring over mountains",
  aspectRatio: "16:9"
});

console.log("Operation started:", operation);
// Guardar operation ID para consultar después

// Opción 2: Generar y esperar (con callback de progreso)
const video = await veo.generateAndWait(
  {
    prompt: "A golden eagle soaring over mountains",
    aspectRatio: "16:9"
  },
  {
    pollInterval: 30000, // Check cada 30s
    maxAttempts: 20,     // Max 10 minutos
    onProgress: (msg) => console.log(msg)
  }
);

console.log("Video URL:", video.videoUrl);
```

### Ejemplo con React:

```typescript
import { useState } from 'react';
import { VeoVertexProvider } from '@/services/cinematic/providers/VeoVertexProvider';

function VideoGenerator() {
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const generateVideo = async () => {
    const veo = new VeoVertexProvider();

    try {
      const video = await veo.generateAndWait(
        {
          prompt: "A golden eagle soaring over mountains",
          aspectRatio: "16:9"
        },
        {
          onProgress: (msg) => setStatus(msg)
        }
      );

      setVideoUrl(video.videoUrl);
      setStatus('Video ready!');
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <button onClick={generateVideo}>Generate Video</button>
      <p>{status}</p>
      {videoUrl && <video src={videoUrl} controls />}
    </div>
  );
}
```

---

## 📁 ARCHIVOS CREADOS

```
supabase/functions/veo-generate-video/
└── index.ts                                    # ✅ Edge Function

src/services/cinematic/providers/
└── VeoVertexProvider.ts                        # ✅ Cliente frontend

scripts/
├── extract-vertex-ai-secrets.sh                # ✅ Extractor de secrets
└── configure-supabase-veo-secrets.sh           # Script CLI (no funciona en Big Sur)

/tmp/
├── vertex-ai-email.txt                         # ✅ Secret 1 (temporal)
└── vertex-ai-private-key.txt                   # ✅ Secret 2 (temporal)

Docs/
├── SUPABASE_VEO_DEPLOYMENT.md                  # ✅ Guía de deployment
├── PASO_1_COMPLETADO.md                        # ✅ Service Account
└── PASO_2_COMPLETADO.md                        # ✅ Este archivo
```

---

## ⚠️ LIMITACIONES CONOCIDAS

### 1. Polling de Operaciones
El endpoint de status check de Veo tiene problemas conocidos:
- Error: "Operation ID must be a Long"
- Workaround: Ver status en Google Cloud Console
- Para producción: Implementar webhook o usar SDK oficial

### 2. Tiempo de Generación
- Veo tarda **2-5 minutos** por video
- No usar `generateAndWait()` en producción sin optimizaciones
- Mejor approach: Iniciar generación → Guardar operation ID → Polling asíncrono/webhook

### 3. Costos
- **$0.40 por segundo de video**
- Video de 5s = ~$2.00 USD
- Requiere billing habilitado en `curios-vertex`

---

## ✅ CHECKLIST DE DEPLOYMENT

- [ ] Ir a Supabase Dashboard
- [ ] Crear función `veo-generate-video`
- [ ] Copiar código de `supabase/functions/veo-generate-video/index.ts`
- [ ] Deploy función
- [ ] Ir a Settings → Secrets
- [ ] Agregar `VERTEX_AI_SERVICE_ACCOUNT_EMAIL`
- [ ] Agregar `VERTEX_AI_PRIVATE_KEY`
- [ ] Test con curl (ver arriba)
- [ ] Verificar respuesta exitosa
- [ ] Integrar en webapp con `VeoVertexProvider`

---

## 🎯 PRÓXIMOS PASOS

### Immediate (deploy):
1. **Desplegar función** en Supabase Dashboard
2. **Configurar secrets**
3. **Test con curl**

### Después:
1. **Integrar en webapp** usando `VeoVertexProvider`
2. **Crear UI** para input de prompts
3. **Implementar progreso visual** (spinner/progress bar)
4. **Guardar videos** en almacenamiento (Supabase Storage/Cloud Storage)
5. **Optimizar polling** (webhooks o background job)

---

## 🔗 LINKS ÚTILES

- 📊 Supabase Dashboard: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo
- 🔧 Edge Functions: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions
- ⚙️  Settings (Secrets): https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/functions
- 📖 Supabase Docs: https://supabase.com/docs/guides/functions
- 🎬 Google Cloud Console: https://console.cloud.google.com/vertex-ai/generative/vision

---

**Status:** ✅ **TODO LISTO PARA DESPLEGAR**

¿Quieres que te guíe paso a paso en el deployment desde el Dashboard?
