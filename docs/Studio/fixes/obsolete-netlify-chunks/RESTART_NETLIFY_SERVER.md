# 🚨 Solución Rápida: Función No Encontrada (404)

## Problema

La función `/render-chunk` devuelve **404 Not Found** porque el servidor Netlify Dev necesita ser reiniciado después de los cambios.

## Solución

### Opción 1: Reiniciar Servidor Netlify Dev

```bash
# Detén el servidor actual (Ctrl+C en la terminal donde corre)
# Luego ejecuta:
npm run dev
```

### Opción 2: Usar `netlify dev` directamente

```bash
# Si npm run dev no funciona, usa:
netlify dev
```

## Verificación

Después de reiniciar, deberías ver en la terminal:

```
◈ Functions server is listening on 8888

◈ Loaded function render-chunk (serverless).
  URL: http://localhost:8888/render-chunk
  
◈ Loaded function render-video (serverless).
◈ Loaded function search-amazon-products (serverless).
◈ Loaded function social-share (serverless).
```

## Si Sigue Sin Funcionar

### Opción A: Verificar que Netlify CLI está instalado

```bash
netlify --version
# Si no está instalado:
npm install -g netlify-cli
```

### Opción B: Verificar package.json

Asegúrate de que `package.json` tenga:

```json
{
  "scripts": {
    "dev": "netlify dev"
  }
}
```

### Opción C: Limpiar cache y reiniciar

```bash
# Limpia el cache de Netlify
rm -rf .netlify

# Reinicia
npm run dev
```

## Checklist

- [ ] Servidor detenido (Ctrl+C)
- [ ] Ejecutar `npm run dev`
- [ ] Ver mensaje "Loaded function render-chunk"
- [ ] Probar en http://localhost:8888/phase6-test
- [ ] Activar Production Mode
- [ ] Hacer clic en "Test Chunked Renderer"

## Comandos de Emergencia

Si nada funciona:

```bash
# 1. Mata todos los procesos de Netlify
killall -9 netlify-cli node

# 2. Limpia todo
rm -rf .netlify node_modules/.cache

# 3. Reinstala dependencias (opcional)
npm install

# 4. Reinicia
npm run dev
```

## Nota Importante

**SIEMPRE que cambies archivos en `/netlify/functions/`**, necesitas:
1. Detener el servidor (Ctrl+C)
2. Reiniciar con `npm run dev`

Netlify Dev **NO** detecta cambios en funciones automáticamente.

---

**Siguiente paso**: Reinicia el servidor y vuelve a probar! 🚀
