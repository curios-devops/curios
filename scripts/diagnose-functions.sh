#!/bin/bash

echo "🔍 Diagnóstico de Netlify Functions"
echo "===================================="
echo ""

echo "1️⃣ Verificando archivos de funciones:"
ls -lh netlify/functions/*.js netlify/functions/*.mjs 2>/dev/null

echo ""
echo "2️⃣ Verificando si el servidor está corriendo:"
if lsof -ti:8888 > /dev/null; then
    echo "✅ Puerto 8888 está en uso"
    lsof -ti:8888 | xargs ps -p
else
    echo "❌ Puerto 8888 NO está en uso"
fi

echo ""
echo "3️⃣ Probando endpoint /render-chunk:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8888/render-chunk

echo ""
echo "4️⃣ Probando endpoint /.netlify/functions/render-chunk:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8888/.netlify/functions/render-chunk

echo ""
echo "5️⃣ Verificando netlify.toml:"
if [ -f "netlify.toml" ]; then
    echo "✅ netlify.toml existe"
    grep -A 5 "\[functions\]" netlify.toml
else
    echo "❌ netlify.toml NO existe"
fi

echo ""
echo "6️⃣ Verificando package.json type:"
grep '"type"' package.json

echo ""
echo "===================================="
echo "💡 Recomendaciones:"
echo ""
echo "Si ves 404 en AMBOS endpoints:"
echo "  → Detén el servidor (Ctrl+C)"
echo "  → Borra .netlify: rm -rf .netlify"
echo "  → Reinicia: npm run dev"
echo ""
echo "Si ves 200 en /.netlify/functions/render-chunk:"
echo "  → Cambia la URL en el código a usar el prefijo"
echo ""
