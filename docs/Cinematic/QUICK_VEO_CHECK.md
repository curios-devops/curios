# 🔍 Verificar Videos Generados con Veo

## 📋 MÉTODO 1: Google Cloud Console (MÁS FÁCIL)

### Paso 1: Ve a Vertex AI
```
https://console.cloud.google.com/vertex-ai/generative/vision?project=curios-vertex
```

### Paso 2: Busca "Video generation" o "Veo"
En el menú lateral, busca:
- "Generative AI" → "Video generation"
- O "Veo"

### Paso 3: Ver historial de generaciones
Deberías ver una lista de videos generados con:
- ✅ Status (Complete, In Progress, Failed)
- ✅ Timestamp
- ✅ Prompt usado
- ✅ Preview del video

### Paso 4: Descargar video
Si el status es "Complete":
- Click en el video
- Click "Download" o ver preview
- Esto confirma que SÍ se generó

---

## 📋 MÉTODO 2: Desde la Terminal (Más técnico)

Necesitamos el `operation_name` de tu última generación. ¿Lo tienes guardado?

Si lo tienes, el formato es:
```
projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/UUID
```

### Script de verificación:

```bash
#!/bin/bash

# Reemplaza con tu operation name
OPERATION_NAME="projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/TU_UUID_AQUI"

# Obtener token
TOKEN=$(gcloud auth print-access-token)

# Consultar status
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://us-central1-aiplatform.googleapis.com/v1/${OPERATION_NAME}"
```

---

## 📋 MÉTODO 3: Logs de Supabase

Si desplegaste la función y la ejecutaste, revisa los logs:

### Ir a Supabase Dashboard:
```
https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions/veo-generate-video
```

### Ver logs:
- Click en la función `veo-generate-video`
- Tab "Logs"
- Busca el `operation` retornado

Ejemplo de log exitoso:
```json
{
  "success": true,
  "operation": "projects/curios-vertex/.../operations/4719b5ca-...",
  "message": "Video generation started"
}
```

Copia ese `operation` name.

---

## 🎯 ¿QUÉ BUSCAR?

### ✅ Video Completado:
```json
{
  "done": true,
  "response": {
    "generatedVideos": [{
      "video": {
        "uri": "https://storage.googleapis.com/...",
        "sizeBytes": "2458392"
      }
    }]
  }
}
```

El `uri` es el link temporal al video.

### ⏳ Video en Progreso:
```json
{
  "done": false,
  "metadata": {
    "@type": "type.googleapis.com/...",
    "genericMetadata": {
      "createTime": "2026-04-02T...",
      "updateTime": "2026-04-02T..."
    }
  }
}
```

Espera 2-5 minutos más.

### ❌ Video Fallido:
```json
{
  "done": true,
  "error": {
    "code": 400,
    "message": "..."
  }
}
```

---

## 🚀 ACCIÓN INMEDIATA

### Opción A: Console Web (2 minutos)
1. Ve a: https://console.cloud.google.com/vertex-ai?project=curios-vertex
2. Busca "Video generation" o "Generative AI"
3. Ve historial de videos
4. ✅ Si ves videos → **FUNCIONÓ**
5. ❌ Si está vacío → Revisar logs de Supabase

### Opción B: Logs de Supabase (1 minuto)
1. Ve a: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions/veo-generate-video/logs
2. Busca el último request
3. Copia el `operation` name
4. Úsalo para consultar via API o Console

### Opción C: Test nuevo (5 minutos)
Genera un nuevo video de prueba y observa el proceso:

```bash
curl -X POST \
  "https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNDIyMDYsImV4cCI6MjA1MDcxODIwNn0.wLnIXxThhq144sQpUFzLd_ifimgr1oetMwvchDmMF84" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "prompt": "TEST: A red ball bouncing on a blue floor",
    "aspectRatio": "16:9"
  }'
```

Guarda el `operation` que retorna y espera 3-5 minutos.

---

## ❓ ¿Cuál prefieres que hagamos?

1. **Console Web** - Más visual, más rápido
2. **Logs Supabase** - Ver qué pasó con requests anteriores
3. **Test nuevo** - Generar video de prueba ahora

**Te recomiendo empezar con Console Web (Opción 1).**
