#!/bin/bash

echo "🔍 DIAGNOSTIC COMPLETO - Netlify Functions"
echo "============================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1️⃣ Verificando si el servidor está corriendo..."
if lsof -ti:8888 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor corriendo en puerto 8888${NC}"
    PID=$(lsof -ti:8888 | head -1)
    echo "   PID: $PID"
else
    echo -e "${RED}❌ Servidor NO está corriendo en puerto 8888${NC}"
    echo -e "${YELLOW}   → Ejecuta: npm run dev${NC}"
    exit 1
fi

echo ""
echo "2️⃣ Esperando a que el servidor esté listo..."
sleep 2

echo ""
echo "3️⃣ Test GET a raíz..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ GET / → 200${NC}"
else
    echo -e "${RED}❌ GET / → $HTTP_CODE${NC}"
fi

echo ""
echo "4️⃣ Test GET /render-chunk..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/render-chunk 2>/dev/null)
if [ "$HTTP_CODE" = "405" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ GET /render-chunk → $HTTP_CODE (esperado: 405 Method Not Allowed)${NC}"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ GET /render-chunk → 404 NOT FOUND${NC}"
    echo -e "${YELLOW}   → La función NO está cargada o la ruta es incorrecta${NC}"
else
    echo -e "${YELLOW}⚠️  GET /render-chunk → $HTTP_CODE${NC}"
fi

echo ""
echo "5️⃣ Test POST /render-chunk (payload inválido)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:8888/render-chunk \
    -H "Content-Type: application/json" \
    -d '{"test": true}' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | grep HTTP_CODE | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v HTTP_CODE)

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✅ POST /render-chunk → 400 (función respondiendo correctamente)${NC}"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ POST /render-chunk → 404 NOT FOUND${NC}"
    echo -e "${YELLOW}   → La función NO está accesible${NC}"
else
    echo -e "${YELLOW}⚠️  POST /render-chunk → $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi

echo ""
echo "6️⃣ Test POST /.netlify/functions/render-chunk..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:8888/.netlify/functions/render-chunk \
    -H "Content-Type: application/json" \
    -d '{"test": true}' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | grep HTTP_CODE | cut -d: -f2)

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "500" ]; then
    echo -e "${GREEN}✅ POST /.netlify/functions/render-chunk → $HTTP_CODE${NC}"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠️  POST /.netlify/functions/render-chunk → 404${NC}"
    echo -e "${YELLOW}   → Netlify Dev está usando rutas v2 (/render-chunk)${NC}"
else
    echo -e "${YELLOW}⚠️  POST /.netlify/functions/render-chunk → $HTTP_CODE${NC}"
fi

echo ""
echo "7️⃣ Verificando archivo de función..."
if [ -f "netlify/functions/render-chunk.js" ]; then
    echo -e "${GREEN}✅ netlify/functions/render-chunk.js existe${NC}"
    FILE_SIZE=$(ls -lh netlify/functions/render-chunk.js | awk '{print $5}')
    echo "   Tamaño: $FILE_SIZE"
    
    # Verificar export
    if grep -q "export const handler" netlify/functions/render-chunk.js; then
        echo -e "${GREEN}✅ Exporta 'handler' correctamente${NC}"
    else
        echo -e "${RED}❌ NO exporta 'handler'${NC}"
    fi
else
    echo -e "${RED}❌ netlify/functions/render-chunk.js NO existe${NC}"
fi

echo ""
echo "8️⃣ Verificando netlify.toml..."
if grep -q "directory = \"netlify/functions\"" netlify.toml; then
    echo -e "${GREEN}✅ netlify.toml configurado correctamente${NC}"
else
    echo -e "${RED}❌ netlify.toml NO tiene directorio de funciones${NC}"
fi

echo ""
echo "============================================"
echo "📊 RESUMEN"
echo "============================================"
echo ""

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "500" ]; then
    echo -e "${GREEN}✅ La función SÍ está funcionando!${NC}"
    echo ""
    echo "Si el navegador ve 404:"
    echo "  1. Hard refresh: Cmd+Shift+R"
    echo "  2. Abre DevTools → Network → Disable cache"
    echo "  3. Prueba en modo incógnito"
    echo "  4. Verifica que el código use: fetch('/render-chunk')"
else
    echo -e "${RED}❌ La función NO está funcionando${NC}"
    echo ""
    echo "Posibles soluciones:"
    echo "  1. Detén el servidor (Ctrl+C)"
    echo "  2. Borra cache: rm -rf .netlify"
    echo "  3. Reinicia: npm run dev"
    echo "  4. Espera a ver: 'Loaded function render-chunk'"
fi

echo ""
