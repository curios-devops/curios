#!/bin/bash
###############################################################################
# Setup: Service Account para Vertex AI
# Este script crea una service account con los permisos necesarios para Veo
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Setup: Service Account para Vertex AI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Obtener proyecto actual
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: No hay proyecto configurado"
  echo ""
  echo "💡 Ejecuta:"
  echo "   gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "✅ Proyecto: $PROJECT_ID"
echo ""

# Configuración
SA_NAME="veo-video-generator"
SA_DISPLAY_NAME="Veo Video Generator for CuriosAI"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="./vertex-ai-veo-key.json"

echo "📋 Configuración:"
echo "   Service Account: $SA_NAME"
echo "   Email: $SA_EMAIL"
echo "   Key file: $KEY_FILE"
echo ""

# Paso 1: Crear Service Account
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Paso 1: Crear Service Account"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar si ya existe
if gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  echo "ℹ️  Service Account ya existe: $SA_EMAIL"
else
  echo "🔨 Creando Service Account..."
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="$SA_DISPLAY_NAME" \
    --description="Service account para generar videos con Veo 3.1 en Vertex AI"

  echo "✅ Service Account creada"
fi
echo ""

# Paso 2: Asignar permisos
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Paso 2: Asignar Permisos (IAM Roles)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Roles necesarios
ROLES=(
  "roles/aiplatform.user"           # Para usar Vertex AI
  "roles/serviceusage.serviceUsageConsumer"  # Para consumir servicios
)

for ROLE in "${ROLES[@]}"; do
  echo "🔐 Asignando role: $ROLE"

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" \
    --condition=None \
    >/dev/null 2>&1

  echo "   ✅ Role asignado"
done
echo ""

# Paso 3: Generar Key
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Paso 3: Generar JSON Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$KEY_FILE" ]; then
  echo "⚠️  Key file ya existe: $KEY_FILE"
  read -p "¿Sobrescribir? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelado. Usando key existente."
    echo ""
  else
    rm "$KEY_FILE"
    echo "🔨 Generando nueva key..."
    gcloud iam service-accounts keys create "$KEY_FILE" \
      --iam-account="$SA_EMAIL"
    echo "✅ Key generada: $KEY_FILE"
  fi
else
  echo "🔨 Generando key..."
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SA_EMAIL"
  echo "✅ Key generada: $KEY_FILE"
fi
echo ""

# Paso 4: Verificar permisos
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Paso 4: Verificar Configuración"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Service Account:"
gcloud iam service-accounts describe "$SA_EMAIL" \
  --format="table(email, displayName, disabled)"
echo ""

echo "Roles asignados:"
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:serviceAccount:$SA_EMAIL"
echo ""

# Paso 5: Instrucciones de seguridad
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Paso 5: SEGURIDAD - IMPORTANTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "⚠️  NUNCA expongas este archivo en el frontend:"
echo "   $KEY_FILE"
echo ""
echo "✅ Este archivo SOLO debe estar en:"
echo "   1. Backend (Supabase Edge Functions)"
echo "   2. Servidor (Netlify Functions)"
echo "   3. Variables de entorno cifradas"
echo ""
echo "❌ NO hacer:"
echo "   - Commitear a git"
echo "   - Incluir en build del frontend"
echo "   - Exponer vía API pública"
echo ""

# Paso 6: Agregar a .gitignore
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Paso 6: Actualizar .gitignore"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! grep -q "vertex-ai-veo-key.json" .gitignore 2>/dev/null; then
  echo "# Vertex AI Service Account Keys" >> .gitignore
  echo "vertex-ai-veo-key.json" >> .gitignore
  echo "*-veo-key.json" >> .gitignore
  echo "✅ Agregado a .gitignore"
else
  echo "ℹ️  Ya está en .gitignore"
fi
echo ""

# Resumen final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Completado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Resumen:"
echo "   ✅ Service Account creada: $SA_EMAIL"
echo "   ✅ Permisos asignados (aiplatform.user)"
echo "   ✅ Key generada: $KEY_FILE"
echo "   ✅ .gitignore actualizado"
echo ""

echo "🚀 Próximos pasos:"
echo "   1. NO commitear $KEY_FILE a git"
echo "   2. Ejecutar: bash scripts/test-vertex-ai-with-sa.sh"
echo "   3. Si funciona, configurar en Supabase Edge Function"
echo ""

echo "📚 Documentación:"
echo "   - Service Accounts: https://cloud.google.com/iam/docs/service-accounts"
echo "   - Vertex AI Auth: https://cloud.google.com/vertex-ai/docs/authentication"
echo ""
