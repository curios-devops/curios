# Despliegue Manual de Pexels Edge Function

## Opción 1: Usar Supabase Dashboard (Recomendado) ✅

### Paso 1: Ir al Dashboard
1. Abre https://supabase.com/dashboard
2. Selecciona tu proyecto: **gpfccicfqynahflehpqo**
3. Ve a la sección **Edge Functions** en el menú lateral

### Paso 2: Crear Nueva Función
1. Click en "Create a new function"
2. Nombre: `pexels-search`
3. Copiar el contenido del archivo: `supabase/functions/pexels-search/index.ts`
4. Pegarlo en el editor
5. **IMPORTANTE:** Desmarcar "Verify JWT" (la función debe ser pública)
6. Click en "Deploy function"

### Paso 3: Configurar Secret (API Key)
1. En el dashboard, ve a **Project Settings** > **Edge Functions**
2. Busca la sección "Secrets"
3. Agregar nuevo secret:
   - **Name:** `PEXELS_API_KEY`
   - **Value:** `qZJZQy2z9xJYxrnlq9l20GCZXB3LFvuctVu9EvvR2SJ5BBrlob44N4No`
4. Click "Save"

### Paso 4: Probar la Función
Abre la terminal y ejecuta:

```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/pexels-search \
  -H 'Content-Type: application/json' \
  -d '{"query": "coffee", "type": "videos", "perPage": 3}'
```

Deberías ver un resultado con videos de café.

---

## Opción 2: Usar GitHub Actions (Automático)

Si configuramos GitHub Actions, el despliegue será automático en cada push.

### Crear workflow file:

Archivo: `.github/workflows/deploy-supabase-functions.yml`

```yaml
name: Deploy Supabase Functions

on:
  push:
    branches:
      - main
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Deploy pexels-search
        run: |
          supabase functions deploy pexels-search \
            --project-ref gpfccicfqynahflehpqo \
            --no-verify-jwt
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Luego agregar el secret `SUPABASE_ACCESS_TOKEN` en GitHub Settings > Secrets.

---

## Verificación Post-Despliegue

### 1. Verificar que la función existe:
```bash
curl https://gpfccicfqynahflehpqo.supabase.co/functions/v1/pexels-search
```

### 2. Probar búsqueda de videos:
```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/pexels-search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "ocean sunset",
    "type": "videos",
    "perPage": 5
  }'
```

### 3. Probar búsqueda de fotos:
```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/pexels-search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "mountain landscape",
    "type": "photos",
    "perPage": 5,
    "orientation": "landscape"
  }'
```

### 4. Ver logs en tiempo real:
En el Dashboard > Edge Functions > pexels-search > Logs

---

## Troubleshooting

### Error: "PEXELS_API_KEY not configured"
- Verifica que el secret esté configurado en Supabase Dashboard
- El nombre debe ser exactamente: `PEXELS_API_KEY`

### Error: CORS
- Verifica que `corsHeaders` estén en el código
- La función ya incluye CORS headers correctamente

### Error: 404 Not Found
- La función no está desplegada
- Verifica en Dashboard > Edge Functions

---

## Siguiente Paso

Una vez desplegada la función, puedes probar el flujo completo:

1. Ve a tu app: https://curiosai.com
2. Genera un video desde Studio
3. Verifica en los logs que aparece: `[Pexels] Searching via Edge Function`
4. El video debe generarse con assets de Pexels sin errores de seguridad

---

## Resumen de Cambios

✅ **Antes:** API key expuesta en cliente (`VITE_PEXELS_API_KEY`)
❌ **Problema:** Netlify security scan failure

✅ **Ahora:** API key segura en Supabase Edge Function
✅ **Beneficio:** Sin exposición, mismo patrón que Brave search
