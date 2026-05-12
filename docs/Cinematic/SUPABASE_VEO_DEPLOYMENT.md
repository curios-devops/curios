# 🚀 Deployment: Supabase Edge Function para Veo

**Problema detectado:** Supabase CLI requiere macOS 12+, pero tienes Big Sur (macOS 11).

---

## 📋 OPCIONES DE DEPLOYMENT

### ✅ Opción A: Usar Supabase Dashboard (Web) - **RECOMENDADO**

1. **Ve a Supabase Dashboard:**
   https://supabase.com/dashboard/project/gpfccicfqynahflehpqo

2. **Navega a Edge Functions:**
   - Click en "Edge Functions" en el menú lateral
   - Click en "Create a new function"

3. **Configurar función:**
   - **Nombre:** `veo-generate-video`
   - **Copiar código** de: `supabase/functions/veo-generate-video/index.ts`
   - Click en "Deploy function"

4. **Configurar Secrets:**
   - Ve a "Project Settings" > "Edge Functions" > "Secrets"
   - Agregar 2 secrets:

   **Secret 1:**
   ```
   Name: VERTEX_AI_SERVICE_ACCOUNT_EMAIL
   Value: veo-video-generator@curios-vertex.iam.gserviceaccount.com
   ```

   **Secret 2:**
   ```
   Name: VERTEX_AI_PRIVATE_KEY
   Value: [Copiar de vertex-ai-veo-key.json]
   ```

   Para obtener el private key:
   ```bash
   cat vertex-ai-veo-key.json | python3 -c "import json,sys; print(json.load(sys.stdin)['private_key'])"
   ```

---

### ✅ Opción B: Deploy desde otra máquina con macOS 12+

Si tienes acceso a otra Mac con macOS Monterey o superior:

1. **Clonar repositorio**
2. **Instalar Supabase CLI:**
   ```bash
   brew install supabase/tap/supabase
   ```

3. **Login:**
   ```bash
   supabase login
   ```

4. **Link al proyecto:**
   ```bash
   supabase link --project-ref gpfccicfqynahflehpqo
   ```

5. **Configurar secrets:**
   ```bash
   bash scripts/configure-supabase-veo-secrets.sh
   ```

6. **Deploy:**
   ```bash
   supabase functions deploy veo-generate-video
   ```

---

### ✅ Opción C: GitHub Actions (CI/CD) - **AUTOMÁTICO**

Crear workflow que deploya automáticamente al hacer push:

```yaml
# .github/workflows/deploy-supabase-functions.yml
name: Deploy Supabase Functions

on:
  push:
    branches: [main]
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

      - run: supabase functions deploy veo-generate-video --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

### ✅ Opción D: Manual con curl (sin CLI)

Deployar usando la API REST de Supabase:

```bash
# Obtener access token desde dashboard
SUPABASE_ACCESS_TOKEN="tu_token_aqui"
PROJECT_REF="gpfccicfqynahflehpqo"

# Deploy function
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/veo-generate-video" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @supabase/functions/veo-generate-video/index.ts
```

---

## 🔧 CONFIGURACIÓN DE SECRETS (Todas las opciones)

Los secrets necesarios son:

### 1. VERTEX_AI_SERVICE_ACCOUNT_EMAIL
```
veo-video-generator@curios-vertex.iam.gserviceaccount.com
```

### 2. VERTEX_AI_PRIVATE_KEY

Para extraer del JSON key:

```bash
# Método 1: Python (recomendado)
cat vertex-ai-veo-key.json | python3 -c "import json,sys; print(json.load(sys.stdin)['private_key'])"

# Método 2: jq
cat vertex-ai-veo-key.json | jq -r '.private_key'

# Método 3: Manual
# Abrir vertex-ai-veo-key.json
# Copiar el valor del campo "private_key" (incluyendo \n)
```

**IMPORTANTE:** El private key debe incluir los `\n` literales. Se ve así:
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFA...\n-----END PRIVATE KEY-----\n
```

---

## 📝 ARCHIVOS CREADOS

```
supabase/functions/veo-generate-video/
└── index.ts                           # Edge Function implementada ✅

scripts/
└── configure-supabase-veo-secrets.sh  # Script de configuración (requiere CLI)
```

---

## 🧪 TEST DE LA FUNCIÓN

Una vez desplegada, probar con curl:

```bash
# URL de tu función
FUNCTION_URL="https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video"
SUPABASE_ANON_KEY="tu_anon_key_aqui"

# Test: Generar video
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "prompt": "A golden eagle soaring over mountains at sunrise",
    "aspectRatio": "16:9"
  }'

# Respuesta esperada:
# {
#   "success": true,
#   "operation": "projects/curios-vertex/.../operations/UUID",
#   "message": "Video generation started..."
# }
```

---

## 🚀 PRÓXIMOS PASOS

1. **Desplegar función** (usar Opción A - Dashboard)
2. **Configurar secrets** en Dashboard
3. **Test con curl** (ver arriba)
4. **Crear cliente TypeScript** para frontend
5. **Integrar en webapp**

---

## 📚 REFERENCIAS

- 🔗 Supabase Dashboard: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo
- 🔗 Edge Functions Docs: https://supabase.com/docs/guides/functions
- 🔗 Secrets Management: https://supabase.com/docs/guides/functions/secrets

---

## ⚠️ NOTA SOBRE macOS Big Sur

Supabase CLI no funciona en Big Sur. Opciones:

1. ✅ Usar Dashboard (Opción A) - **Más simple**
2. ✅ Usar otra Mac con macOS 12+ (Opción B)
3. ✅ Usar GitHub Actions (Opción C) - **Mejor para CI/CD**
4. ✅ Actualizar a macOS Monterey o superior

**Recomendación:** Usa el Dashboard web (Opción A) para deployment manual.
