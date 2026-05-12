# 🎬 Veo Video Storage: Google Cloud vs Supabase

## 🔍 SITUACIÓN ACTUAL

Has desplegado la función de Veo en Supabase y viste que se creó un bucket en Google Cloud (`curios-veo-video`) pero está vacío.

### ¿Por qué el bucket está vacío?

**El video NO se almacena automáticamente.** Veo genera el video pero lo mantiene temporalmente. Necesitas:

1. **Esperar** que la operación complete (2-5 minutos)
2. **Descargar** el video de la respuesta de Google
3. **Guardar** en almacenamiento permanente

---

## 📊 OPCIONES DE ALMACENAMIENTO

### ✅ Opción 1: Supabase Storage (RECOMENDADO)

**Ventajas:**
- ✅ Ya tienes Supabase configurado
- ✅ Fácil asociar videos a usuarios (RLS)
- ✅ URLs públicas/privadas
- ✅ CDN incluido
- ✅ Más económico para archivos pequeños
- ✅ Integración perfecta con tu webapp

**Desventajas:**
- ⚠️ Límite 50MB/archivo (tier gratuito)
- ⚠️ Límite 1GB total (tier gratuito)

**Costo:**
- Free: 1GB storage, 2GB bandwidth/mes
- Pro ($25/mo): 100GB storage, 200GB bandwidth

**Videos de Veo:** 5-10 segundos = ~2-5MB → ✅ Perfecto para Supabase

---

### ⚖️ Opción 2: Google Cloud Storage

**Ventajas:**
- ✅ Sin límite de tamaño
- ✅ Más económico para archivos grandes
- ✅ Ya en el mismo proyecto que Veo

**Desventajas:**
- ❌ Más complejo de configurar
- ❌ Requiere service account
- ❌ URLs firmadas temporales
- ❌ No integrado con Supabase auth

**Costo:**
- $0.020 por GB/mes
- $0.12 por GB transferencia

---

## 🎯 RECOMENDACIÓN: Supabase Storage

**Flujo completo:**
```
1. Usuario → Supabase Edge Function (genera)
2. Edge Function → Vertex AI Veo
3. Guardar operation en tabla `veo_videos`
4. Polling/Webhook → Video listo
5. Descargar video de Google
6. Subir a Supabase Storage
7. Actualizar tabla con URL
8. Usuario ve su video
```

---

## 🛠️ IMPLEMENTACIÓN RÁPIDA

### Paso 1: Crear Bucket

Dashboard: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/storage/buckets

```
Nombre: veo-videos
Public: ✅ Sí
File size limit: 10MB
MIME types: video/mp4
```

### Paso 2: Crear Tabla

SQL Editor: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/sql

```sql
CREATE TABLE veo_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  prompt TEXT NOT NULL,
  operation_name TEXT,
  storage_path TEXT,
  public_url TEXT,
  status TEXT DEFAULT 'generating',
  aspect_ratio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE veo_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own videos"
  ON veo_videos FOR SELECT
  USING (auth.uid() = user_id);
```

### Paso 3: Actualizar Edge Function

Ya tienes la base. Solo necesitas:
1. Descargar video cuando esté listo
2. Subir a Supabase Storage
3. Actualizar tabla

---

## ✅ VENTAJAS

**Para Usuarios:**
- Dashboard de sus videos
- URLs compartibles
- Historial

**Para Ti:**
- Control total
- Cuotas fáciles (ej: 10 videos/mes)
- Analytics
- Fácil cleanup

---

**¿Quieres que implemente esto ahora?**
