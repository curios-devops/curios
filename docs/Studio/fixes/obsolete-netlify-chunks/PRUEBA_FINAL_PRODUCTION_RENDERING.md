# ✅ GUÍA FINAL: Iniciar y Probar Production Rendering

## Situación Actual

- ✅ SQL script listo: `setup-studio-videos-bucket.sql`
- ✅ Función Netlify creada: `render-chunk.mjs`
- ✅ Chunks optimizados: 3 segundos (FREE tier compatible)
- ✅ UI actualizada: Botón "Test Chunked Renderer"
- ❌ Servidor NO está corriendo (por eso el 404)

---

## 🚀 Pasos para Probar (EN ORDEN)

### Paso 1: Configurar Supabase (Una sola vez)

1. **Abre Supabase Dashboard**: https://supabase.com/dashboard
2. **Ve a tu proyecto** → SQL Editor
3. **Copia todo el contenido** de: `/scripts/setup-studio-videos-bucket.sql`
4. **Pégalo en el editor** y haz click en "Run"
5. **Verifica** que veas: `id: studio-videos, public: true`

### Paso 2: Configurar Environment Variables (Una sola vez)

En Netlify Dashboard → Site Settings → Environment Variables, agrega:

| Variable | Valor | Dónde Encontrarlo |
|----------|-------|-------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (secret) | Supabase → Settings → API → service_role |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Ya debería existir |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Ya debería existir |

**⚠️ IMPORTANTE**: El `SUPABASE_SERVICE_ROLE_KEY` es SECRETO. Nunca lo expongas en el frontend.

### Paso 3: Iniciar el Servidor Local

```bash
# En tu terminal, dentro de /Users/marcelo/Documents/Curios
npm run dev
```

**Deberías ver**:
```
✔ Vite dev server ready on port 5173
◈ Local dev server ready: http://localhost:8888

⬥ Loaded function render-video
⬥ Loaded function render-chunk          ← ✅ IMPORTANTE
⬥ Loaded function search-amazon-products
⬥ Loaded function social-share
```

**SI NO VES "Loaded function render-chunk"**: Hay un problema. Avísame.

**Ignora el warning**: `(node:27596) [DEP0060] DeprecationWarning` - es inofensivo.

### Paso 4: Abrir la Página de Pruebas

1. **Abre en tu navegador**: http://localhost:8888/phase6-test
2. Deberías ver la página de pruebas con varios botones

### Paso 5: Activar Production Mode

1. Busca el **toggle "Production Mode"** (checkbox en la parte superior)
2. **Actívalo** (debería ponerse verde)
3. Deberías ver el banner verde:
   ```
   🎉 Production Mode Enabled - Optimized for FREE Tier!
   Videos will be rendered with Remotion in 3-second chunks
   ```

### Paso 6: Probar Rendering Individual

1. Click en el botón **"Test Chunked Renderer"** (morado, con ícono Play)
2. **Observa el console** (F12 → Console en Chrome)
3. **Deberías ver**:
   ```
   [Chunk Planner] Planning chunks
   [Chunked Renderer] Production mode ENABLED
   [Chunked Renderer] Production render starting
   ```

### Paso 7: Verificar Resultados

**Si funciona** ✅:
- Verás "Phase 6B: Rendering" → "success"
- Los chunks se renderizan (~6-9s cada uno)
- URLs de Supabase Storage aparecen
- ProgressivePlayer muestra los videos

**Si NO funciona** ❌:
- Revisa el console para errores
- Verifica que el servidor esté corriendo
- Asegúrate de que `SUPABASE_SERVICE_ROLE_KEY` esté configurado

---

## 🔍 Troubleshooting

### Error: 404 Not Found

**Causa**: El servidor Netlify Dev no está corriendo

**Solución**:
```bash
npm run dev
```

Verifica que veas "Loaded function render-chunk".

### Error: 500 Internal Server Error

**Causa**: `SUPABASE_SERVICE_ROLE_KEY` no está configurado

**Solución**:
1. Crea un archivo `.env` en la raíz del proyecto
2. Agrega:
   ```
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```
3. Reinicia el servidor

### Error: "Supabase not configured"

**Causa**: Falta la variable de entorno

**Solución**:
```bash
# Verifica que exista el archivo .env
cat .env | grep SUPABASE_SERVICE_ROLE_KEY

# Si no existe, créalo:
echo "SUPABASE_SERVICE_ROLE_KEY=tu_key" >> .env
```

### Error: "Storage bucket not found"

**Causa**: No ejecutaste el SQL script

**Solución**: Ve al **Paso 1** y ejecuta el script en Supabase.

---

## 📊 Qué Esperar

### Timeline Normal (30s video, 10 chunks)

```
t=0s:   Click "Test Chunked Renderer"
t=1s:   Chunk planning complete
t=2s:   Start rendering chunks 0, 1, 2 (parallel)
t=9s:   Chunks 0, 1, 2 ready ✅
t=10s:  Start rendering chunks 3, 4, 5
t=17s:  Chunks 3, 4, 5 ready ✅
t=18s:  Start rendering chunks 6, 7, 8
t=25s:  Chunks 6, 7, 8 ready ✅
t=26s:  Start rendering chunk 9
t=33s:  Chunk 9 ready ✅
t=34s:  ALL COMPLETE! 🎉
```

**Total**: ~34 segundos para renderizar un video de 30 segundos.

### Costos

- **Netlify Free**: ✅ 125,000 segundos/mes = ~3,600 videos
- **Supabase Free**: ✅ 1 GB storage = ~50 videos
- **Total costo**: **$0/mes** (hasta 50 videos)

---

## ✅ Checklist Final

Antes de hacer click en "Test Chunked Renderer", verifica:

- [ ] SQL script ejecutado en Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado en `.env`
- [ ] Servidor corriendo (`npm run dev`)
- [ ] Ves "Loaded function render-chunk" en terminal
- [ ] Navegador en http://localhost:8888/phase6-test
- [ ] Production Mode toggle ACTIVADO (verde)
- [ ] Console del navegador abierto (F12)

**Todo listo?** → Click en "Test Chunked Renderer"! 🚀

---

## 🎯 Próximos Pasos (Después de que funcione)

1. **Implementar video stitching** (combinar chunks en video final)
2. **Agregar botón de descarga** para el video completo
3. **Optimizar cache** para renders más rápidos
4. **Deploy a producción** en Netlify

---

**¿Problemas?** Revisa el console y terminal, copia los errores y avísame! 🙋‍♂️
