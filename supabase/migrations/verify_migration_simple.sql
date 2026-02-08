-- ============================================
-- VERIFICACIÓN SIMPLE POST-MIGRACIÓN
-- Ejecuta esto después de aplicar la migración
-- (Versión simplificada sin storage.policies)
-- ============================================

-- 1. ✅ Verificar que las tablas existen
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('videos', 'chapters')
ORDER BY table_name;

-- Resultado esperado:
-- chapters  | 10
-- videos    | 9


-- 2. ✅ Verificar storage bucket
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'videos';

-- Resultado esperado:
-- videos | videos | true | <timestamp>


-- 3. ✅ Verificar índices
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('videos', 'chapters')
ORDER BY tablename, indexname;

-- Resultado esperado: 5 índices
-- idx_chapters_order       | chapters
-- idx_chapters_video_id    | chapters
-- idx_videos_created_at    | videos
-- idx_videos_status        | videos
-- idx_videos_user_id       | videos


-- 4. ✅ Verificar políticas RLS en tablas
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('videos', 'chapters')
ORDER BY tablename, policyname;

-- Resultado esperado: 6 políticas (3 para videos, 3 para chapters)


-- 5. ✅ Verificar trigger
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%updated_at%';

-- Resultado esperado:
-- update_videos_updated_at | videos | EXECUTE FUNCTION update_updated_at_column()


-- ============================================
-- 6. ✅ TEST: Insertar datos de prueba
-- ============================================

-- Insertar video de prueba
INSERT INTO videos (
  title, 
  description, 
  total_duration, 
  chapter_count, 
  status
) VALUES (
  'Test Video - Chapter System',
  'Testing the new chapter-based rendering system',
  15,
  3,
  'rendering'
) RETURNING id, title, status, created_at;

-- ⚠️ IMPORTANTE: Guarda el ID del video que aparece arriba!
-- Lo necesitarás para el siguiente paso.


-- 7. ✅ Insertar chapters de prueba
-- ⚠️ MÉTODO 1: Usa WITH para obtener el ID automáticamente
WITH test_video AS (
  SELECT id FROM videos WHERE title = 'Test Video - Chapter System' LIMIT 1
)
INSERT INTO chapters (
  video_id, 
  chapter_id, 
  order_index, 
  duration, 
  storage_url, 
  free
) 
SELECT 
  test_video.id,
  'chapter_001',
  1,
  5,
  'https://example.com/test/chapter_001.webm',
  true
FROM test_video
UNION ALL
SELECT 
  test_video.id,
  'chapter_002',
  2,
  5,
  'https://example.com/test/chapter_002.webm',
  true
FROM test_video
UNION ALL
SELECT 
  test_video.id,
  'chapter_003',
  3,
  5,
  'https://example.com/test/chapter_003.webm',
  true
FROM test_video
RETURNING chapter_id, order_index, storage_url;

-- ⚠️ MÉTODO 2 (Alternativo): Reemplaza manualmente el UUID
-- Si el método de arriba no funciona, copia el UUID del paso 6 y reemplaza aquí:
-- INSERT INTO chapters (video_id, chapter_id, order_index, duration, storage_url, free) VALUES 
--   ('PEGA-TU-UUID-AQUI', 'chapter_001', 1, 5, 'https://example.com/test/chapter_001.webm', true),
--   ('PEGA-TU-UUID-AQUI', 'chapter_002', 2, 5, 'https://example.com/test/chapter_002.webm', true),
--   ('PEGA-TU-UUID-AQUI', 'chapter_003', 3, 5, 'https://example.com/test/chapter_003.webm', true)
-- RETURNING chapter_id, order_index, storage_url;


-- 8. ✅ Verificar datos insertados con JOIN
SELECT 
  v.id,
  v.title,
  v.total_duration,
  v.chapter_count,
  v.status,
  json_agg(
    json_build_object(
      'chapter_id', c.chapter_id,
      'order_index', c.order_index,
      'duration', c.duration,
      'storage_url', c.storage_url,
      'free', c.free
    ) ORDER BY c.order_index
  ) as chapters
FROM videos v
LEFT JOIN chapters c ON v.id = c.video_id
WHERE v.title = 'Test Video - Chapter System'
GROUP BY v.id;


-- 9. ✅ Test CASCADE DELETE
-- Eliminar el video (los chapters se deben eliminar automáticamente)
DELETE FROM videos WHERE title = 'Test Video - Chapter System';

-- Verificar que los chapters también se eliminaron:
SELECT COUNT(*) as remaining_test_chapters 
FROM chapters 
WHERE chapter_id LIKE 'chapter_00%';

-- Resultado esperado: 0 (todos eliminados por CASCADE)


-- ============================================
-- ✅ CHECKLIST DE VERIFICACIÓN FINAL
-- ============================================

/*
Marca cada item cuando lo verifiques:

[ ] Tabla 'videos' existe con 9 columnas
[ ] Tabla 'chapters' existe con 10 columnas
[ ] Bucket 'videos' existe en storage y es público
[ ] 5 índices creados correctamente
[ ] 6 políticas RLS creadas (3 videos + 3 chapters)
[ ] Trigger 'update_videos_updated_at' existe
[ ] Test de inserción funciona
[ ] Query con JOIN retorna JSON correcto
[ ] Cascade delete funciona (elimina chapters al eliminar video)

Storage Policies - Verificar manualmente en Dashboard:
[ ] "Videos are publicly accessible" (SELECT)
[ ] "Authenticated users can upload videos" (INSERT)
[ ] "Users can update own video files" (UPDATE)
[ ] "Users can delete own video files" (DELETE)

Si todos los checks están ✅, ¡la migración fue EXITOSA!
*/


-- ============================================
-- 🎉 PRÓXIMOS PASOS
-- ============================================

/*
1. Ejecutar el test en el navegador:
   import { testChapterRendering } from './services/studio/test/testChapterRendering';
   testChapterRendering().then(result => console.log(result));

2. Verificar que los videos se suben a Supabase Storage

3. Integrar ChapterPlayer en la UI

4. ¡Disfrutar del nuevo sistema de chapters! 🎬
*/
