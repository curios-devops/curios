# Cómo Obtener tu API Key de Google AI para Veo 3.1

## Problema Identificado
La key actual en tu `.env` (`VEO_API_KEY=sk-a1ca279...`) **NO es una API key de Google**.

Las API keys de Google AI tienen este formato:
```
AIzaSy...
```

## Pasos para Obtener la API Key Correcta

### 1. Ve a Google AI Studio
🔗 https://aistudio.google.com/apikey

### 2. Inicia sesión con tu cuenta de Google
- Usa tu cuenta personal o de tu organización

### 3. Crea una nueva API Key
- Click en **"Create API key"** o **"Get API key"**
- Selecciona un proyecto de Google Cloud (o crea uno nuevo)
- Google generará una key con formato: `AIzaSy...`

### 4. Copia la API Key

### 5. Actualiza tu `.env`
Reemplaza la línea:
```bash
VEO_API_KEY=sk-a1ca279824f14e9b9536a0b4a33fcef0
```

Por:
```bash
VITE_GOOGLE_AI_API_KEY=AIzaSy... # Tu key real aquí
```

**NOTA:** Ya tienes una key de Gemini en tu `.env`:
```
GEMINI_API_KEY=REDACTED_ROTATED_KEY
```

**¡PUEDES USAR LA MISMA KEY!** La Gemini API y Veo 3.1 comparten la misma autenticación.

## Opción Rápida: Usa tu GEMINI_API_KEY existente

Actualiza tu `.env` así:
```bash
# Usar la misma key para Gemini y Veo (es la misma API)
GEMINI_API_KEY=REDACTED_ROTATED_KEY
VITE_GOOGLE_AI_API_KEY=REDACTED_ROTATED_KEY
```

## Verificar que Veo está Habilitado en tu Proyecto

### 1. Ve a Google AI Studio
🔗 https://aistudio.google.com/

### 2. Prueba Veo en el Playground
- En el menú lateral, busca **"Veo"** o **"Video generation"**
- Si no aparece, puede que tu proyecto no tenga acceso aún
- Veo 3.1 está en **paid preview** (requiere billing habilitado)

### 3. Habilita Billing en Google Cloud
Veo 3.1 **NO es gratuito**. Necesitas:
- Un proyecto de Google Cloud con billing habilitado
- Asociar tu API key a ese proyecto

🔗 https://console.cloud.google.com/billing

## Costos de Veo 3.1

Según Google (Marzo 2026):
- **Veo 3.1 Generate Preview**: ~$0.80 por segundo de video
- Ejemplo: Video de 5 segundos = ~$4.00

## Próximos Pasos

1. ✅ Actualiza `.env` con tu `GEMINI_API_KEY`
2. ✅ Ejecuta: `node scripts/test-veo.mjs`
3. ✅ Verifica si tienes acceso a Veo
4. Si no tienes acceso: Habilita billing en Google Cloud
5. Si todo funciona: ¡Integra en tu webapp!

## Troubleshooting

### Error: "API key not valid"
- Verifica que la key empiece con `AIzaSy...`
- No uses la key antigua `sk-...`

### Error: "Method not found"
- Tu proyecto no tiene acceso a Veo aún
- Veo está en paid preview
- Necesitas aplicar para acceso o esperar a disponibilidad general

### Error: "PERMISSION_DENIED"
- Habilita billing en tu proyecto de Google Cloud
- Asocia tu API key al proyecto correcto
