#!/bin/bash
###############################################################################
# Configurar Secrets de Vertex AI en Supabase
# Lee el service account key y configura secrets en Supabase CLI
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Configurar Secrets de Vertex AI en Supabase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que existe el service account key
KEY_FILE="vertex-ai-veo-key.json"

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Error: $KEY_FILE no encontrado"
  echo ""
  echo "💡 Ejecuta primero:"
  echo "   bash scripts/setup-vertex-ai-service-account.sh"
  exit 1
fi

echo "✅ Service Account Key encontrada: $KEY_FILE"
echo ""

# Extraer datos del JSON
SERVICE_ACCOUNT_EMAIL=$(cat "$KEY_FILE" | grep '"client_email"' | cut -d '"' -f 4)
PRIVATE_KEY=$(cat "$KEY_FILE" | grep -A 100 '"private_key"' | grep -v '"private_key"' | grep -v '"private_key_id"' | sed 's/.*"private_key": "\(.*\)".*/\1/' | head -1)

# Si PRIVATE_KEY está vacío, extraer de otra manera
if [ -z "$PRIVATE_KEY" ]; then
  # Extraer todo el contenido entre "private_key": " y el siguiente "
  PRIVATE_KEY=$(cat "$KEY_FILE" | python3 -c "import json,sys; print(json.load(sys.stdin)['private_key'])")
fi

echo "📋 Datos extraídos:"
echo "   Email: $SERVICE_ACCOUNT_EMAIL"
echo "   Private Key: ${PRIVATE_KEY:0:50}... (${#PRIVATE_KEY} chars)"
echo ""

if [ -z "$SERVICE_ACCOUNT_EMAIL" ] || [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Error: No se pudieron extraer datos del JSON key"
  exit 1
fi

# Verificar que supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
  echo "❌ Error: Supabase CLI no está instalado"
  echo ""
  echo "💡 Instalar con:"
  echo "   brew install supabase/tap/supabase"
  exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Configurar secrets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Configurando Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📝 Secret 1: VERTEX_AI_SERVICE_ACCOUNT_EMAIL"
echo "$SERVICE_ACCOUNT_EMAIL" | supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL --env-file /dev/stdin

echo ""
echo "📝 Secret 2: VERTEX_AI_PRIVATE_KEY"
# IMPORTANTE: El private key debe pasarse con \n literales
echo "$PRIVATE_KEY" | supabase secrets set VERTEX_AI_PRIVATE_KEY --env-file /dev/stdin

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Secrets Configurados"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Secrets en Supabase:"
supabase secrets list

echo ""
echo "🚀 Próximos pasos:"
echo "   1. Desplegar función: supabase functions deploy veo-generate-video"
echo "   2. Test: bash scripts/test-supabase-veo-function.sh"
echo ""
