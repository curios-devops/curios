## Debug: Ver error completo del POST /videos

En localhost:8888, abre DevTools:

1. **F12** o **Cmd+Option+I**
2. Ve a la pestaña **Network**
3. Filtra por **Fetch/XHR**
4. Genera un video
5. Busca la petición **POST videos**
6. Click derecho → **Copy** → **Copy as cURL**
7. O ve a la pestaña **Response** para ver el error JSON completo

El error 400 tiene un mensaje específico que nos dirá exactamente qué campo está mal.

También puedes:
- Click en la petición **videos**
- Ver la pestaña **Payload** (lo que enviamos)
- Ver la pestaña **Response** (el error que retorna Supabase)

El response debería mostrar algo como:
```json
{
  "code": "PGRST204",
  "message": "Could not find the 'X' column...",
  "details": null,
  "hint": null
}
```
