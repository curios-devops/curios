# 🗄️ Aplicar Migración de Chapter Video System

## Opción A: Ejecutar en Supabase Dashboard (RECOMENDADO)

### Paso 1: Acceder al SQL Editor

1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. En el menú lateral, click en **"SQL Editor"**
3. Click en **"New query"**

### Paso 2: Copiar y ejecutar el SQL

1. Abre el archivo: `supabase/migrations/create_chapter_video_system.sql`
2. Copia TODO el contenido (Cmd+A, Cmd+C)
3. Pégalo en el SQL Editor de Supabase
4. Click en **"Run"** (o Cmd+Enter)

### Paso 3: Verificar que se creó correctamente

Ejecuta esta query para verificar:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('videos', 'chapters');

-- Verificar storage bucket
SELECT * FROM storage.buckets WHERE id = 'videos';
```

Deberías ver:
- ✅ Tabla `videos`
- ✅ Tabla `chapters`
- ✅ Bucket `videos`

---

## Opción B: Ejecutar con Supabase CLI

### Requisitos previos:
```bash
# Instalar Supabase CLI si no lo tienes
brew install supabase/tap/supabase

# Verificar instalación
supabase --version
```

### Paso 1: Link al proyecto remoto

```bash
# Desde la raíz del proyecto
supabase link --project-ref YOUR_PROJECT_REF

# Te pedirá tu database password
```

### Paso 2: Aplicar la migración

```bash
# Aplicar migración al proyecto remoto
supabase db push

# O aplicar manualmente el SQL
supabase db execute -f supabase/migrations/create_chapter_video_system.sql
```

### Paso 3: Verificar

```bash
# Verificar que las tablas existen
supabase db diff
```

---

## Opción C: Ejecutar Localmente (Para desarrollo)

### Paso 1: Iniciar Supabase local

```bash
# Iniciar todos los servicios de Supabase localmente
supabase start

# Esto iniciará:
# - PostgreSQL en localhost:54322
# - Studio UI en http://localhost:54323
# - API en http://localhost:54321
```

### Paso 2: Aplicar la migración

```bash
# Aplicar migración a la base de datos local
supabase db reset

# O aplicar el SQL directamente
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/create_chapter_video_system.sql
```

### Paso 3: Verificar en Studio

Abre http://localhost:54323 y verifica las tablas en el editor de SQL

---

## 📋 Post-Migración: Verificaciones

Después de aplicar la migración, ejecuta estas queries para verificar:

### 1. Verificar estructura de tablas

```sql
-- Columnas de videos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'videos';

-- Columnas de chapters
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chapters';
```

### 2. Verificar índices

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('videos', 'chapters');
```

### 3. Verificar políticas RLS

```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('videos', 'chapters');
```

### 4. Verificar storage bucket

```sql
SELECT * FROM storage.buckets WHERE id = 'videos';

SELECT * FROM storage.policies WHERE bucket_id = 'videos';
```

---

## ✅ Checklist de Migración

- [ ] Backup de la base de datos (opcional pero recomendado)
- [ ] Ejecutar script SQL en Supabase
- [ ] Verificar que tablas `videos` y `chapters` existen
- [ ] Verificar que bucket `videos` existe
- [ ] Verificar políticas RLS (5 para videos, 3 para chapters, 4 para storage)
- [ ] Verificar índices (5 índices creados)
- [ ] Verificar trigger `update_videos_updated_at`
- [ ] Probar inserción de un video de prueba:

```sql
-- Insertar video de prueba
INSERT INTO videos (title, description, total_duration, chapter_count, status)
VALUES ('Test Video', 'Testing chapter system', 15, 3, 'rendering')
RETURNING *;

-- Insertar chapter de prueba (reemplaza <video_id> con el ID del video anterior)
INSERT INTO chapters (video_id, chapter_id, order_index, duration, storage_url, free)
VALUES ('<video_id>', 'chapter_001', 1, 5, 'https://example.com/chapter1.webm', true)
RETURNING *;

-- Verificar
SELECT * FROM videos;
SELECT * FROM chapters;
```

---

## 🚨 Troubleshooting

### Error: "relation already exists"
Si ya corriste la migración antes, las tablas pueden existir. Opciones:
1. **Ignorar** - Si las estructuras son correctas
2. **Limpiar** - Ejecutar esto primero:
```sql
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
-- Luego ejecutar la migración completa
```

### Error: "bucket already exists"
El bucket 'videos' ya existe. Esto es OK, el `ON CONFLICT DO NOTHING` lo manejará.

### Error: "permission denied"
Asegúrate de estar usando un usuario con permisos de admin en Supabase.

---

## 🎯 Próximos Pasos

Una vez que la migración esté aplicada:

1. ✅ Verificar que todo funciona con las queries de arriba
2. 🧪 Ejecutar el test: `testChapterRendering()`
3. 🎬 Probar rendering de un video real
4. 📊 Verificar que chapters se suben a storage
5. 🎮 Integrar ChapterPlayer en la UI

---

## 📞 Ayuda

Si necesitas ayuda:
- Documentación Supabase: https://supabase.com/docs
- Supabase CLI: https://supabase.com/docs/guides/cli
- SQL Editor: https://supabase.com/docs/guides/database/sql-editor
