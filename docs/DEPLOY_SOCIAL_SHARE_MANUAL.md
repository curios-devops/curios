# 🚀 Deploy social-share a Supabase (Manual)

## Opción 1: Dashboard Web (Más Fácil) ✅

### Paso 1: Ir al Dashboard
1. Abre: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions
2. Login si es necesario

### Paso 2: Editar la Función
1. Busca la función **`social-share`** en la lista
2. Click en el nombre para abrirla
3. Click en **"Edit function"** (arriba a la derecha)

### Paso 3: Copiar el Código Nuevo
1. Abre en VS Code: `supabase/functions/social-share/index.ts`
2. **Selecciona TODO** el contenido (Cmd+A)
3. **Copia** (Cmd+C)

### Paso 4: Pegar y Desplegar
1. En el Dashboard, **borra todo** el código existente
2. **Pega** el nuevo código (Cmd+V)
3. **IMPORTANTE:** Asegúrate que "Verify JWT" esté **DESMARCADO** ❌
4. Click en **"Deploy function"** (botón azul)
5. Espera ~30 segundos a que termine el deploy

### Paso 5: Verificar
Ejecuta en terminal:
```bash
curl -I 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/social-share?query=test'
```

Deberías ver: `content-type: text/html; charset=utf-8`

---

## Opción 2: API de Supabase (Avanzado)

Si prefieres usar la API directamente:

```bash
# 1. Obtener el código
CODE=$(cat supabase/functions/social-share/index.ts)

# 2. Deploy via API
curl -X POST 'https://api.supabase.com/v1/projects/gpfccicfqynahflehpqo/functions/social-share' \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"slug\": \"social-share\",
    \"verify_jwt\": false,
    \"body\": $(jq -Rs . supabase/functions/social-share/index.ts)
  }"
```

Necesitas el access token de: https://supabase.com/dashboard/account/tokens

---

## ✅ Verificación Post-Deploy

### Test 1: Verificar Content-Type
```bash
curl -I 'https://curiosai.com/functions/v1/social-share?query=test'
```
✅ Debe mostrar: `content-type: text/html; charset=utf-8`

### Test 2: Verificar HTML
```bash
curl -s 'https://curiosai.com/functions/v1/social-share?query=test' | head -20
```
✅ Debe mostrar HTML válido con meta tags

### Test 3: Verificar Imagen PNG
```bash
curl -s 'https://curiosai.com/functions/v1/social-share?query=test' | grep -o 'curiosai-og-image.*\.png'
```
✅ Debe mostrar: `curiosai-og-image-1200x627.png`

### Test 4: LinkedIn Post Inspector
1. Ve a: https://www.linkedin.com/post-inspector/
2. Pega: `https://curiosai.com/functions/v1/social-share?query=test%20query&snippet=test%20snippet`
3. Click "Inspect"
✅ Debe mostrar preview correctamente (sin error "cannot display preview")

---

## 🐛 Troubleshooting

### Error: "Cannot display preview" en LinkedIn
**Causa:** LinkedIn no puede cargar la imagen o el HTML
**Solución:**
1. Verifica que `curiosai-og-image-1200x627.png` exista en `public/`
2. Verifica que el Content-Type sea `text/html; charset=utf-8`
3. Usa LinkedIn Post Inspector para ver el error específico

### Error: La función no responde
**Causa:** Deploy no completado
**Solución:**
1. Ve al Dashboard > Edge Functions > social-share > Logs
2. Verifica que no haya errores de sintaxis
3. Reintenta el deploy

### Error: Redirect en lugar de HTML
**Causa:** Bot detection fallando
**Solución:**
1. Agrega `&preview=true` a la URL para forzar preview mode
2. Ejemplo: `...social-share?query=test&preview=true`

---

## 📊 Cambios en esta Versión

✅ **LinkedIn Fix:**
- Cambio de SVG dinámico → PNG estático como fallback
- `og:image:type` ahora es `image/png` en lugar de `image/svg+xml`
- Usa `/curiosai-og-image-1200x627.png` cuando no hay imagen del artículo

✅ **Preview Mode:**
- Nuevo parámetro `preview=true` para testing
- Fuerza mostrar HTML sin redirect

✅ **Headers Correctos:**
- `Content-Type: text/html; charset=utf-8` explícito
- `Cache-Control: public, max-age=300` para performance

---

## 🎯 Siguiente Paso

Una vez desplegado, prueba compartir en LinkedIn:
1. Ve a https://curiosai.com
2. Haz una búsqueda
3. Click en compartir → LinkedIn
4. LinkedIn debe mostrar el preview correctamente ✅
