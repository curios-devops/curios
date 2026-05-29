# Anam WebSocket Streaming - Setup Guide

**Fecha:** 2026-03-10
**Estado:** ✅ Código listo - Pendiente deployment

---

## 🎯 ¿Qué hemos implementado?

### Arquitectura Correcta para Anam

```
Frontend (Vite)
    ↓
Supabase Function (get-anam-token)  ← Obtiene token seguro
    ↓
Frontend recibe token temporal
    ↓
WebSocket directo a Anam  ← Streaming en tiempo real!
    ↓
Video frames recibidos
    ↓
MediaSource API renderiza video
```

**✅ API key NUNCA se expone al frontend**
**✅ Streaming directo (no proxy backend)**
**✅ Compatible con Netlify**

---

## 📁 Archivos Creados

### 1. Supabase Edge Function
**`supabase/functions/get-anam-token/index.ts`**
- Genera token temporal de Anam
- Protege el API key en el servidor
- Retorna sessionId, token, wsUrl

### 2. Servicio de Streaming (Frontend)
**`src/services/search/avatar/services/anamStreamingService.ts`**
- Cliente WebSocket para Anam
- Maneja conexión y frames de video
- Usa token seguro de Supabase

### 3. Componente Player
**`src/services/search/avatar/components/AnamAvatarPlayer.tsx`**
- Renderiza video streaming
- Usa MediaSource API
- Auto-conecta y reproduce

### 4. Documentación
**`docs/Search/architecture/ANAM_WEBSOCKET_ARCHITECTURE.md`**
- Arquitectura completa
- Guía de implementación
- Comparación con enfoque anterior

---

## 🚀 Deployment

### Paso 1: Deploy get-anam-token function

**Opción A: Via Dashboard (Recomendado)**

1. Ir a: https://app.supabase.com/project/gpfccicfqynahflehpqo/functions
2. Click "Create a new function"
3. Nombre: `get-anam-token`
4. Copiar código de: `supabase/functions/get-anam-token/index.ts`
5. Click "Deploy function"
6. En settings: Disable "Enforce JWT"
7. Save

**Opción B: Via Script**

```bash
./scripts/deploy-anam-websocket.sh
```
(Muestra instrucciones para deployment manual)

### Paso 2: Verificar ANAM_API_KEY

El secret ya debe estar configurado del deployment anterior:
- https://app.supabase.com/project/gpfccicfqynahflehpqo/settings/vault
- Verificar que existe: `ANAM_API_KEY`

### Paso 3: Test

```bash
curl -X POST \
  https://gpfccicfqynahflehpqo.supabase.co/functions/v1/get-anam-token \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Respuesta esperada:**
```json
{
  "sessionId": "sess_xxxxx",
  "token": "tok_xxxxx",
  "wsUrl": "wss://api.anam.ai/v1/streaming",
  "expiresAt": "2026-03-10T23:00:00.000Z"
}
```

---

## 🧪 Testing Local

### 1. Verificar token generation

```typescript
// En browser console
const { data } = await supabase.functions.invoke('get-anam-token', {
  body: { personaId: 'default' }
});

console.log('Token received:', data);
```

### 2. Test streaming completo

```typescript
import { AnamStreamingClient } from './services/anamStreamingService';

// Crear cliente
const client = new AnamStreamingClient({
  onVideoFrame: (frame) => {
    console.log('Video frame:', frame.size, 'bytes');
  },
  onConnected: () => {
    console.log('✅ Connected to Anam!');
  },
});

// Conectar (usa token de Supabase internamente)
await client.connect();

// Enviar audio
const audioBlob = await fetch('/test-audio.mp3').then(r => r.blob());
await client.sendAudio(audioBlob);

// Esperar frames de video...
```

### 3. Test con AnamAvatarPlayer

```typescript
import AnamAvatarPlayer from './components/AnamAvatarPlayer';

function TestPage() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Generar audio con TTS
  const generateAudio = async () => {
    const response = await fetch(
      'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/elevenlabs-tts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello world' })
      }
    );

    const { audio } = await response.json();
    const blob = base64ToBlob(audio, 'audio/mpeg');
    setAudioBlob(blob);
  };

  return (
    <div>
      <button onClick={generateAudio}>Generate Audio</button>
      {audioBlob && (
        <AnamAvatarPlayer
          audioBlob={audioBlob}
          onError={(err) => console.error(err)}
        />
      )}
    </div>
  );
}
```

---

## 🔍 Troubleshooting

### Token generation fails

**Error:** `Failed to get Anam token`

**Solución:**
1. Verificar que `get-anam-token` está deployed
2. Verificar ANAM_API_KEY en Supabase Vault
3. Check function logs en Dashboard

### WebSocket connection fails

**Error:** `WebSocket connection error`

**Solución:**
1. Verificar que token es válido
2. Check Anam API status
3. Verificar formato de wsUrl
4. Revisar CORS si aplica

### No video frames received

**Error:** Video no aparece

**Solución:**
1. Verificar que audio fue enviado
2. Check logs: `[Anam] Received video frame`
3. Verificar MediaSource compatibility
4. Try different browser

---

## 📊 Flujo Completo de Integración

### En AvatarSearchResults.tsx

```typescript
import { useState, useEffect } from 'react';
import { generateAvatarVideo } from '../services/elevenLabsAurora';
import AnamAvatarPlayer from '../components/AnamAvatarPlayer';

export default function AvatarSearchResults() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [narrativeText, setNarrativeText] = useState('');

  useEffect(() => {
    async function generate() {
      // 1. Generate narrative
      const narrative = await generateNarrativeResponse(query);
      setNarrativeText(narrative);

      // 2. Generate TTS audio
      const { audioUrl } = await generateAvatarVideo(narrative);

      // 3. Convert audio URL to Blob for Anam
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      setAudioBlob(blob);
    }

    generate();
  }, [query]);

  return (
    <div>
      {audioBlob ? (
        <AnamAvatarPlayer audioBlob={audioBlob} />
      ) : (
        <div>Generating...</div>
      )}

      <NarrativeText text={narrativeText} />
    </div>
  );
}
```

---

## ✅ Checklist de Deployment

- [ ] Deploy `get-anam-token` function
- [ ] Verificar ANAM_API_KEY secret
- [ ] Test token generation (curl)
- [ ] Test WebSocket connection (browser)
- [ ] Test video streaming (browser)
- [ ] Integrar en AvatarSearchResults
- [ ] Test end-to-end completo

---

## 🎯 Próximos Pasos

1. **Deploy ahora:**
   - `get-anam-token` function vía Dashboard

2. **Test:**
   - Token generation
   - WebSocket connection
   - Video streaming

3. **Integrar:**
   - Reemplazar audio-only por AnamAvatarPlayer
   - Test full flow

4. **Optimizar:**
   - Add auth check en get-anam-token (production)
   - Implement token refresh
   - Add error recovery

---

## 📞 Support

**Logs:**
- Token function: https://app.supabase.com/project/gpfccicfqynahflehpqo/functions/get-anam-token/logs
- Browser console: Buscar `[Anam]` logs

**Docs:**
- Arquitectura: `docs/Search/architecture/ANAM_WEBSOCKET_ARCHITECTURE.md`
- Anam API: https://docs.anam.ai

---

**Estado:** ✅ Código completo, listo para deploy y test!
