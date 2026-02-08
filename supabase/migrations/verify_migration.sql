-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- Ejecuta esto después de aplicar la migración
-- ============================================

-- 1. Verificar que las tablas existen
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

-- ============================================
-- 2. Verificar storage bucket
-- ============================================
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'videos';

-- Resultado esperado:
-- videos | videos | true | <timestamp>

-- ============================================
-- 3. Verificar índices
-- ============================================
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

-- ============================================
-- 4. Verificar políticas RLS
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('videos', 'chapters')
ORDER BY tablename, policyname;

-- Resultado esperado: 6 políticas (3 para videos, 3 para chapters)

-- ============================================
-- 5. Verificar storage policies
-- ============================================
SELECT 
  name as policy_name,
  bucket_id,
  operation
FROM storage.policies
WHERE bucket_id = 'videos'
ORDER BY name;

-- Resultado esperado: 4 políticas de storage

-- ============================================
-- 6. Verificar trigger
-- ============================================
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
-- 7. TEST: Insertar datos de prueba
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

-- GUARDA EL ID DEL VIDEO PARA EL SIGUIENTE PASO!

-- Insertar chapters de prueba (reemplaza <video_id> con el ID de arriba)
INSERT INTO chapters (
  video_id, 
  chapter_id, 
  order_index, 
  duration, 
  storage_url, 
  free
) VALUES 
  ('<video_id>', 'chapter_001', 1, 5, 'https://example.com/test/chapter_001.webm', true),
  ('<video_id>', 'chapter_002', 2, 5, 'https://example.com/test/chapter_002.webm', true),
  ('<video_id>', 'chapter_003', 3, 5, 'https://example.com/test/chapter_003.webm', true)
RETURNING chapter_id, order_index, storage_url;

-- ============================================
-- 8. Verificar datos insertados
-- ============================================

-- Ver video con todos sus chapters
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

-- ============================================
-- 9. Limpiar datos de prueba (opcional)
-- ============================================

-- Si quieres eliminar el test:
-- DELETE FROM videos WHERE title = 'Test Video - Chapter System';
-- (Los chapters se eliminan automáticamente por CASCADE)

-- ============================================
-- ✅ CHECKLIST DE VERIFICACIÓN
-- ============================================

/*
Marca cada item cuando lo verifiques:

[ ] Tablas 'videos' y 'chapters' existen
[ ] Bucket 'videos' existe en storage
[ ] 5 índices creados correctamente
[ ] 6 políticas RLS creadas
[ ] 4 políticas de storage creadas
[ ] Trigger 'update_videos_updated_at' existe
[ ] Test de inserción funciona
[ ] Query con JOIN funciona
[ ] Cascade delete funciona

Si todos los checks están ✅, ¡la migración fue exitosa!
*/

-- ============================================
-- 🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE
-- ============================================

-- Próximos pasos:
-- 1. Ejecutar testChapterRendering() en el navegador
-- 2. Verificar que los videos se suben a storage
-- 3. Integrar ChapterPlayer en la UI
-- 4. ¡Disfrutar del nuevo sistema de chapters!
