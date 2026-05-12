#!/bin/bash
###############################################################################
# Test: Generative Language API (Gemini API) con API Key
# Endpoint: generativelanguage.googleapis.com
# Auth: API Key (x-goog-api-key header)
# Modelo: veo-3.1-generate-preview
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test: Generative Language API (Gemini API)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Leer API key del .env
if [ ! -f .env ]; then
  echo "❌ Error: .env no encontrado"
  exit 1
fi

API_KEY=$(grep "GEMINI_API_KEY=" .env | cut -d '=' -f2)

if [ -z "$API_KEY" ]; then
  echo "❌ Error: GEMINI_API_KEY no encontrada en .env"
  exit 1
fi

echo "✅ API Key encontrada: ${API_KEY:0:15}..."
echo ""

# Configuración
ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateVideos"
PROMPT="A golden eagle soaring over snow-capped mountains at sunrise, cinematic shot"

echo "📋 Configuración:"
echo "   Endpoint: $ENDPOINT"
echo "   Modelo: veo-3.1-generate-preview"
echo "   Prompt: $PROMPT"
echo ""

# Crear request body
REQUEST_BODY=$(cat <<EOF
{
  "prompt": "$PROMPT",
  "config": {
    "aspectRatio": "16:9"
  }
}
EOF
)

echo "📤 Enviando request..."
echo ""

# Ejecutar curl y guardar respuesta
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $API_KEY" \
  -d "$REQUEST_BODY")

# Separar body y status code
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📥 Status: $HTTP_STATUS"
echo ""

# Analizar respuesta
if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 202 ]; then
  echo "✅ REQUEST EXITOSO"
  echo ""
  echo "📄 Respuesta completa:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""

  # Extraer operation name si existe
  OPERATION=$(echo "$BODY" | jq -r '.name // empty' 2>/dev/null)
  if [ -n "$OPERATION" ]; then
    echo "🎬 Operación iniciada: $OPERATION"
    echo ""
    echo "💡 Para consultar status, ejecuta:"
    echo "   curl -H 'x-goog-api-key: $API_KEY' \\"
    echo "     'https://generativelanguage.googleapis.com/v1beta/$OPERATION'"
  fi
elif [ "$HTTP_STATUS" -eq 400 ]; then
  echo "❌ ERROR 400: Bad Request"
  echo ""
  echo "Respuesta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Posibles causas:"
  echo "   - Formato de request incorrecto"
  echo "   - Modelo no existe o nombre incorrecto"
elif [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 403 ]; then
  echo "❌ ERROR $HTTP_STATUS: Autenticación/Autorización"
  echo ""
  echo "Respuesta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Posibles causas:"
  echo "   - API key inválida"
  echo "   - API key sin permisos para Veo"
  echo "   - Proyecto sin billing habilitado"
elif [ "$HTTP_STATUS" -eq 429 ]; then
  echo "❌ ERROR 429: Rate Limit Excedido"
  echo ""
  echo "Respuesta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Causas:"
  echo "   - Quota diaria agotada"
  echo "   - Proyecto sin billing habilitado"
  echo ""
  echo "🔗 Ver quota: https://ai.dev/rate-limit"
elif [ "$HTTP_STATUS" -eq 404 ]; then
  echo "❌ ERROR 404: Modelo No Encontrado"
  echo ""
  echo "Respuesta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 El modelo 'veo-3.1-generate-preview' puede no estar disponible en Gemini API"
  echo "   Prueba con Vertex AI en su lugar"
else
  echo "❌ ERROR $HTTP_STATUS"
  echo ""
  echo "Respuesta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test completado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
