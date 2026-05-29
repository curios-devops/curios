# ⚠️ IMPORTANTE: Deploy Manual de get-anam-token

## ¿Por qué el avatar sigue diciendo "Hello"?

El avatar dice "Hello" porque la función `get-anam-token` en Supabase **NO tiene los cambios deployados**.

## Cambios que Necesitas Deployar

Se actualizó la función `get-anam-token` para eliminar el saludo inicial del avatar:
- Agregado `firstMessage: ''`
- Agregado `enableGreeting: false`

**SIN ESTE DEPLOYMENT, EL AVATAR SEGUIRÁ DICIENDO "Hello"**

## Archivo a Deployar

**Ubicación**: `supabase/functions/get-anam-token/index.ts`

## Opción 1: Deploy con Supabase CLI (Recomendado)

Si tienes Supabase CLI v1.150 instalado:

```bash
# Asegúrate de estar en el directorio raíz del proyecto
cd /Users/marcelo/Documents/Curios

# Deployar la función
supabase functions deploy get-anam-token --no-verify-jwt
```

## Opción 2: Deploy Manual desde Supabase Dashboard

### Paso 1: Acceder a Supabase Dashboard
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto: `gpfccicfqynahflehpqo`

### Paso 2: Ir a Edge Functions
1. En el menú lateral izquierdo, click en **Edge Functions**
2. Busca la función `get-anam-token` en la lista
3. Click en el nombre de la función

### Paso 3: Editar el Código
1. Click en el botón **Edit function** o el ícono de editar
2. Reemplaza todo el contenido con el código del archivo:
   `/Users/marcelo/Documents/Curios/supabase/functions/get-anam-token/index.ts`

### Código Actualizado (Líneas 54-64):

```typescript
body: JSON.stringify({
  personaConfig: {
    name: 'CuriosAI Assistant',
    avatarId,
    voiceId: '6bfbe25a-979d-40f3-a92b-5394170af54b',
    llmId: ANAM_DEFAULT_LLM_ID,
    systemPrompt: "[STYLE] Reply in natural speech without formatting. Add pauses using '...' and very occasionally a disfluency. [PERSONALITY] You are a helpful assistant that provides search results and answers.",
    firstMessage: '', // No greeting, stay silent until user provides input
    enableGreeting: false,
  },
}),
```

### Paso 4: Guardar y Deploy
1. Click en **Save** o **Deploy**
2. Espera a que el deployment se complete (usualmente 10-30 segundos)
3. Verifica que el status sea **Active** o **Deployed**

## Verificar el Deployment

Ejecuta este comando para verificar que la función está funcionando:

```bash
curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/get-anam-token' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk4NDQ2MTcsImV4cCI6MjAzNTQyMDYxN30.FZMuhooTcPOPz8lSZVsG_u1cU6gWEqOXH6MXHFaLV64" \
  -H 'Content-Type: application/json' \
  -d '{"avatarId":"071b0286-4cce-4808-bee2-e642f1062de3"}'
```

Deberías recibir una respuesta con un `sessionToken`.

## Resultado Esperado

Después del deployment:
- El avatar **NO** dirá "Hey there! What's on your mind today?" al iniciar
- El avatar permanecerá en silencio hasta que reciba el texto a narrar
- El comportamiento del resto de la aplicación permanece igual

## Notas Importantes

- ⚠️ **NO uses** `supabase start` (Docker no está instalado)
- ⚠️ El CLI de Supabase en Big Sur debe ser v1.150 aproximadamente
- ✅ Si usas CLI, solo necesitas: `supabase functions deploy get-anam-token --no-verify-jwt`
