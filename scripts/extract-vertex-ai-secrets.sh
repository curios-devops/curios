#!/bin/bash
###############################################################################
# Extraer secrets de Service Account para copiar a Supabase Dashboard
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Extraer Secrets de Vertex AI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

KEY_FILE="vertex-ai-veo-key.json"

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Error: $KEY_FILE no encontrado"
  exit 1
fi

echo "✅ Service Account Key encontrada"
echo ""

# Extraer service account email
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 SECRET 1: VERTEX_AI_SERVICE_ACCOUNT_EMAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SERVICE_ACCOUNT_EMAIL=$(cat "$KEY_FILE" | python3 -c "import json,sys; print(json.load(sys.stdin)['client_email'])")

echo "Nombre: VERTEX_AI_SERVICE_ACCOUNT_EMAIL"
echo ""
echo "Valor:"
echo "$SERVICE_ACCOUNT_EMAIL"
echo ""

# Extraer private key
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 SECRET 2: VERTEX_AI_PRIVATE_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PRIVATE_KEY=$(cat "$KEY_FILE" | python3 -c "import json,sys; print(json.load(sys.stdin)['private_key'])")

echo "Nombre: VERTEX_AI_PRIVATE_KEY"
echo ""
echo "Valor (primeros 100 caracteres):"
echo "${PRIVATE_KEY:0:100}..."
echo ""
echo "⚠️  El valor completo tiene ${#PRIVATE_KEY} caracteres"
echo ""

# Guardar en archivo temporal para copiar fácilmente
echo "$SERVICE_ACCOUNT_EMAIL" > /tmp/vertex-ai-email.txt
echo "$PRIVATE_KEY" > /tmp/vertex-ai-private-key.txt

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Secrets Extraídos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Los valores están guardados en:"
echo "   Email: /tmp/vertex-ai-email.txt"
echo "   Private Key: /tmp/vertex-ai-private-key.txt"
echo ""

echo "📋 Para copiar al portapapeles:"
echo "   Email:"
echo "     cat /tmp/vertex-ai-email.txt | pbcopy"
echo ""
echo "   Private Key:"
echo "     cat /tmp/vertex-ai-private-key.txt | pbcopy"
echo ""

echo "🔗 Ahora ve a Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/functions"
echo ""
echo "   1. Click en 'Manage secrets'"
echo "   2. Agregar VERTEX_AI_SERVICE_ACCOUNT_EMAIL (copiar desde /tmp/vertex-ai-email.txt)"
echo "   3. Agregar VERTEX_AI_PRIVATE_KEY (copiar desde /tmp/vertex-ai-private-key.txt)"
echo ""
