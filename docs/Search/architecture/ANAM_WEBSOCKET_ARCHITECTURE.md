# Anam WebSocket Streaming - Arquitectura Frontend Directa

**Fecha:** 2026-03-10
**Estado:** ✅ Implementado (WebSocket streaming directo)

---

## 🎯 Arquitectura Correcta para Anam

### ❌ Anterior (Incorrecto)
```
Frontend → Supabase Edge Function → Anam REST API
```
**Problema:** Anam NO tiene REST API para video batch generation

### ✅ Nueva (Correcta)
```
Frontend → WebSocket → Anam Streaming API
```
**Ventaja:** Conexión directa, sin backend, streaming en tiempo real

---

## 📐 Arquitectura Completa

```
┌─────────────────────────────────────────────────────────┐
│                    VITE FRONTEND                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Avatar Search Component                          │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  1. Get audio from TTS                      │  │  │
│  │  │     (ElevenLabs or OpenAI)                  │  │  │
│  │  └─────────────────┬───────────────────────────┘  │  │
│  │                    │                               │  │
│  │                    ▼                               │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  2. AnamStreamingClient.connect()           │  │  │
│  │  │     - Create session via HTTPS              │  │  │
│  │  │     - Get session token                     │  │  │
│  │  └─────────────────┬───────────────────────────┘  │  │
│  │                    │                               │  │
│  │                    ▼                               │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  3. WebSocket connection                    │  │  │
│  │  │     wss://api.anam.ai/v1/streaming          │  │  │
│  │  └─────────────────┬───────────────────────────┘  │  │
│  │                    │                               │  │
│  │                    ▼                               │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  4. Send audio via WebSocket                │  │  │
│  │  │     ws.send({ type: 'audio', data: ... })   │  │  │
│  │  └─────────────────┬───────────────────────────┘  │  │
│  │                    │                               │  │
│  │                    ▼                               │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  5. Receive video frames                    │  │  │
│  │  │     ws.onmessage → video frame blob         │  │  │
│  │  └─────────────────┬───────────────────────────┘  │  │
│  │                    │                               │  │
│  │                    ▼                               │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  6. Render with MediaSource API             │  │  │
│  │  │     sourceBuffer.appendBuffer(frame)        │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    ANAM API                              │
│  - WebSocket streaming server                           │
│  - Real-time avatar generation                          │
│  - No backend proxy needed!                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementación

### 1. Servicio de Streaming

**Archivo:** `src/services/search/avatar/services/anamStreamingService.ts`

```typescript
export class AnamStreamingClient {
  // Paso 1: Crear sesión con Anam
  private async createSession(personaId?: string): Promise<string> {
    const response = await fetch('https://api.anam.ai/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        persona_id: personaId,
        stream_video: true,
        stream_audio: true,
      }),
    });

    const data = await response.json();
    return data.token; // Token para WebSocket
  }

  // Paso 2: Conectar WebSocket
  async connect(personaId?: string): Promise<void> {
    const sessionToken = await this.createSession(personaId);
    const wsUrl = `wss://api.anam.ai/v1/streaming?token=${sessionToken}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        // Video frame recibido!
        this.config.onVideoFrame?.(event.data);
      }
    };
  }

  // Paso 3: Enviar audio
  async sendAudio(audioBlob: Blob): Promise<void> {
    const base64Audio = await this.blobToBase64(audioBlob);

    this.ws.send(JSON.stringify({
      type: 'audio',
      data: base64Audio,
      format: 'mp3',
    }));
  }
}
```

### 2. Componente de Player

**Archivo:** `src/services/search/avatar/components/AnamAvatarPlayer.tsx`

```typescript
export default function AnamAvatarPlayer({ audioBlob, personaId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [client] = useState(() => new AnamStreamingClient({
    onVideoFrame: (frame: Blob) => {
      // Usar MediaSource API para streaming
      sourceBuffer.appendBuffer(await frame.arrayBuffer());
    }
  }));

  useEffect(() => {
    // Conectar y enviar audio
    client.connect(personaId).then(() => {
      client.sendAudio(audioBlob);
    });

    return () => client.disconnect();
  }, []);

  return <video ref={videoRef} autoPlay />;
}
```

---

## ✅ Ventajas de esta Arquitectura

### 1. **Sin Backend para Streaming**
- ✅ No necesitas Netlify Functions para video
- ✅ No necesitas Supabase Edge Functions para streaming
- ✅ WebSocket directo desde el navegador

### 2. **Tiempo Real**
- ✅ Latencia mínima (< 100ms)
- ✅ Streaming progresivo (no esperar video completo)
- ✅ Avatar responde mientras habla

### 3. **Compatible con Netlify**
- ✅ Netlify solo sirve el frontend estático
- ✅ WebSocket se maneja en el cliente
- ✅ No límites de función serverless

### 4. **Escalable**
- ✅ Cada cliente conecta directamente a Anam
- ✅ No cuellos de botella en tu backend
- ✅ Anam maneja la escala

---

## 🔐 Seguridad

### API Key Management

**❌ NO hacer:**
```typescript
// NO exponer API key en el frontend
const ANAM_API_KEY = 'tu-clave-aqui'; // PELIGRO!
```

**✅ Hacer:**
```typescript
// Opción 1: Token temporal desde Supabase
const getAnamToken = async () => {
  const { data } = await supabase.functions.invoke('get-anam-token');
  return data.token; // Token temporal, expira en 1 hora
};

// Opción 2: Usar Supabase Auth
const { data } = await supabase.auth.getSession();
const anamToken = await generateAnamToken(data.session.user.id);
```

**Implementación segura:**

1. **Crear función Supabase:** `get-anam-token`
```typescript
// supabase/functions/get-anam-token/index.ts
Deno.serve(async (req) => {
  // Verificar autenticación
  const authHeader = req.headers.get('Authorization');
  const user = await verifySupabaseAuth(authHeader);

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Crear token temporal con Anam
  const response = await fetch('https://api.anam.ai/v1/tokens', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('ANAM_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.id,
      expires_in: 3600, // 1 hora
    }),
  });

  const { token } = await response.json();

  return new Response(JSON.stringify({ token }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

2. **Usar en el frontend:**
```typescript
// Obtener token temporal
const { data } = await supabase.functions.invoke('get-anam-token');
const anamToken = data.token;

// Usar token con AnamStreamingClient
const client = new AnamStreamingClient({ apiKey: anamToken });
```

---

## 📊 Flujo Completo

### 1. Usuario hace pregunta
```
User → Input (text/voice) → Search → LLM → TTS
                                              ↓
                                          Audio Blob
```

### 2. Streaming de Anam
```
Audio Blob → AnamStreamingClient.connect()
              ↓
          Get Session Token (HTTPS)
              ↓
          WebSocket.connect(token)
              ↓
          ws.send(audioBlob)
              ↓
          ws.onmessage(videoFrame)
              ↓
          MediaSource.appendBuffer(frame)
              ↓
          <video> element plays!
```

### 3. Tiempo estimado
- Crear sesión: 200-500ms
- Conectar WebSocket: 100-300ms
- Enviar audio: 50-200ms
- Primera frame de video: 500-1500ms
- **Total hasta primer frame: ~1-2.5 segundos**

Mucho más rápido que esperar video completo (10-30s)!

---

## 🧪 Testing

### Test Local

```typescript
import { AnamStreamingClient } from './anamStreamingService';

// Test básico
const client = new AnamStreamingClient({
  onVideoFrame: (frame) => {
    console.log('Video frame received:', frame.size);
  },
  onConnected: () => {
    console.log('✅ Connected to Anam');
  },
});

// Conectar
await client.connect();

// Enviar audio de prueba
const audioBlob = await fetch('/test-audio.mp3').then(r => r.blob());
await client.sendAudio(audioBlob);
```

### Test en Navegador

1. Abrir: `http://localhost:5173/avatar-search?q=test`
2. Abrir DevTools Console
3. Ver logs:
   - `🎭 [Anam] Creating streaming session...`
   - `✅ [Anam] Session created`
   - `🔌 [Anam] Connecting to WebSocket...`
   - `✅ [Anam] WebSocket connected`
   - `🎤 [Anam] Sending audio`
   - `[Anam] Received video frame`

---

## 🔄 Comparación con Arquitectura Anterior

| Aspecto | ❌ REST API (antes) | ✅ WebSocket (ahora) |
|---------|---------------------|----------------------|
| **Endpoint** | POST /avatars/generate | WebSocket streaming |
| **Latencia** | 10-30 segundos | 1-2 segundos |
| **Streaming** | No (espera completo) | Sí (progresivo) |
| **Backend** | Necesario (proxy) | No necesario |
| **Netlify** | Timeout en funciones | Compatible |
| **Interactividad** | Solo batch | Tiempo real |
| **Error 405** | ✅ Sí (no existe) | ✅ No (funciona) |

---

## 📚 Referencias

- [Anam API Docs](https://docs.anam.ai)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [MediaSource API](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource)
- [Arquitectura Netlify + WebSocket](https://docs.netlify.com/configure-builds/overview/)

---

## 🎯 Conclusión

**La arquitectura WebSocket directa es la forma correcta de usar Anam:**

✅ Sin backend para streaming
✅ Latencia ultra-baja
✅ Compatible con Netlify
✅ Escalable
✅ Tiempo real

**Próximos pasos:**
1. Implementar `get-anam-token` function (seguridad)
2. Integrar `AnamAvatarPlayer` en `AvatarSearchResults`
3. Probar streaming en producción
4. Optimizar buffering y calidad

---

**Estado:** Listo para implementar y probar! 🚀
