#!/bin/bash
###############################################################################
# Test: Vertex AI API con gcloud auth
# Endpoint: aiplatform.googleapis.com
# Auth: gcloud auth print-access-token
# Modelo: veo-3.1-generate-001
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test: Vertex AI API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar gcloud auth
echo "🔐 Verificando autenticación gcloud..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1; then
  echo "❌ Error: No hay cuenta activa en gcloud"
  echo ""
  echo "💡 Ejecuta primero:"
  echo "   gcloud auth login"
  exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "✅ Cuenta activa: $ACTIVE_ACCOUNT"
echo ""

# Obtener proyecto
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

# Verificar que Vertex AI API esté habilitada
echo "🔍 Verificando Vertex AI API..."
if ! gcloud services list --enabled --filter="NAME:aiplatform.googleapis.com" --format="value(NAME)" | grep -q aiplatform; then
  echo "⚠️  Vertex AI API no está habilitada"
  echo ""
  echo "💡 Para habilitarla, ejecuta:"
  echo "   gcloud services enable aiplatform.googleapis.com"
  echo ""
  read -p "¿Habilitar ahora? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    gcloud services enable aiplatform.googleapis.com
    echo "✅ API habilitada"
  else
    exit 1
  fi
else
  echo "✅ Vertex AI API habilitada"
fi
echo ""

# Configuración
LOCATION="us-central1"
MODEL_ID="veo-3.1-generate-001"
ENDPOINT="https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning"
PROMPT="A golden eagle soaring over snow-capped mountains at sunrise, cinematic shot"

echo "📋 Configuración:"
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $LOCATION"
echo "   Endpoint: $ENDPOINT"
echo "   Modelo: $MODEL_ID"
echo "   Prompt: $PROMPT"
echo ""

# Crear request body
REQUEST_BODY=$(cat <<EOF
{
  "instances": [{
    "prompt": "$PROMPT"
  }],
  "parameters": {
    "aspectRatio": "16:9",
    "sampleCount": 1
  }
}
EOF
)

echo "📤 Enviando request..."
echo ""

# Obtener access token
ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null)
if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: No se pudo obtener access token"
  exit 1
fi

# Ejecutar curl y guardar respuesta
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$ENDPOINT" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
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
    echo "🎬 Operación Long-Running iniciada: $OPERATION"
    echo ""
    echo "💡 Para consultar status, ejecuta:"
    echo "   curl -H 'Authorization: Bearer \$(gcloud auth print-access-token)' \\"
    echo "     'https://${LOCATION}-aiplatform.googleapis.com/v1/${OPERATION}'"
    echo ""
    echo "O usa gcloud:"
    echo "   gcloud ai operations describe ${OPERATION##*/} --region=$LOCATION"
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
  echo "   - Parámetros inválidos"
elif [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 403 ]; then
  echo "❌ ERROR $HTTP_STATUS: Autenticación/Autorización"
  echo ""
  echo "Respuesta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Posibles causas:"
  echo "   - Cuenta sin permisos para Vertex AI"
  echo "   - Proyecto sin billing habilitado"
  echo "   - IAM roles faltantes"
  echo ""
  echo "Roles requeridos:"
  echo "   - roles/aiplatform.user"
  echo "   - roles/serviceusage.serviceUsageConsumer"
elif [ "$HTTP_STATUS" -eq 429 ]; then
  echo "❌ ERROR 429: Rate Limit Excedido"
  echo ""
  echo "Respuesta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Causas:"
  echo "   - Quota excedida"
  echo "   - Proyecto sin billing habilitado"
elif [ "$HTTP_STATUS" -eq 404 ]; then
  echo "❌ ERROR 404: Recurso No Encontrado"
  echo ""
  echo "Respuesta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Posibles causas:"
  echo "   - Modelo 'veo-3.1-generate-001' no disponible en tu región"
  echo "   - Proyecto '$PROJECT_ID' no existe"
  echo "   - Región '$LOCATION' no soporta Veo"
  echo ""
  echo "Regiones disponibles para Veo:"
  echo "   - us-central1"
  echo "   - europe-west4"
  echo "   - asia-southeast1"
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
