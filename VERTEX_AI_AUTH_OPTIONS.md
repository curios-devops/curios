# 🔐 Opciones de Autenticación para Vertex AI

**Problema detectado:** Tu proyecto `curios-vertex` tiene la restricción:
```
constraints/iam.disableServiceAccountKeyCreation
```

Esto significa que **NO puedes crear JSON keys** para service accounts (política de seguridad común en empresas).

---

## 🎯 ALTERNATIVAS DISPONIBLES

### ✅ Opción 1: User Account (gcloud auth) - **MÁS SIMPLE**

**Cómo funciona:**
- Usas tu cuenta personal (`marcelo@curiosai.com`)
- Autenticación vía `gcloud auth application-default login`
- **Funciona para desarrollo local**

**Ventajas:**
- ✅ Ya lo tienes configurado
- ✅ Funciona inmediatamente
- ✅ No requiere service account keys

**Desventajas:**
- ❌ Solo funciona en tu máquina local
- ❌ No sirve para producción (Supabase/Netlify)
- ❌ Tus credenciales personales en el código

**Cuándo usar:**
- ✅ Desarrollo local
- ✅ Prototipos
- ✅ Testing

**NO usar para:**
- ❌ Producción
- ❌ Despliegues automáticos
- ❌ CI/CD

---

### ✅ Opción 2: Service Account Impersonation - **RECOMENDADO**

**Cómo funciona:**
- Creas una service account (✅ ya creada: `veo-video-generator@curios-vertex.iam.gserviceaccount.com`)
- NO generas JSON key
- Tu user account **impersona** la service account
- Usas token temporal de la service account

**Ventajas:**
- ✅ No necesita JSON keys
- ✅ Cumple políticas de seguridad
- ✅ Permisos separados del usuario
- ✅ Funciona en Cloud Run, Cloud Functions

**Desventajas:**
- ⚠️ Más complejo de configurar
- ⚠️ Requiere permisos adicionales

**Setup:**
```bash
# Dar permiso de impersonación
gcloud iam service-accounts add-iam-policy-binding \
  veo-video-generator@curios-vertex.iam.gserviceaccount.com \
  --member="user:marcelo@curiosai.com" \
  --role="roles/iam.serviceAccountTokenCreator"

# Usar impersonación
gcloud auth application-default login --impersonate-service-account=\
veo-video-generator@curios-vertex.iam.gserviceaccount.com
```

---

### ✅ Opción 3: Workload Identity (Cloud Run / GKE) - **PRODUCCIÓN**

**Cómo funciona:**
- Asocias una service account a un servicio de GCP
- El servicio automáticamente obtiene credenciales
- **NO requiere keys**

**Ventajas:**
- ✅ Más seguro (no hay keys)
- ✅ Automático
- ✅ Diseñado para producción

**Desventajas:**
- ⚠️ Solo funciona en servicios de GCP
- ❌ No funciona en Supabase Edge Functions
- ❌ No funciona en Netlify Functions

**Cuándo usar:**
- ✅ Cloud Run
- ✅ Cloud Functions
- ✅ GKE

---

### ❌ Opción 4: Deshabilitar la Restricción - **NO RECOMENDADO**

**Cómo funciona:**
- Quitas la org policy `constraints/iam.disableServiceAccountKeyCreation`
- Creas JSON keys normalmente

**Ventajas:**
- ✅ Funciona en cualquier lado
- ✅ Más simple

**Desventajas:**
- ❌ Menos seguro
- ❌ Puede violar políticas de tu organización
- ❌ Requiere permisos de Organization Admin

**NO hacer esto si:**
- Tu proyecto es empresarial
- No tienes permisos de organización
- Hay compliance requirements

---

## 🎯 RECOMENDACIÓN PARA TU CASO

### Para Desarrollo (ahora mismo):

**Usa Opción 1: User Account**

```bash
# Ya lo tienes configurado
gcloud auth application-default login
gcloud config set project curios-vertex
```

**Test inmediato:**
```bash
# Esto funcionará con tu cuenta personal
bash scripts/test-vertex-ai.sh
```

---

### Para Producción (después):

**Usa Opción 3: Cloud Run + Workload Identity**

1. **Crea una Cloud Run Function:**
   ```typescript
   // Función que corre en Cloud Run
   // Automáticamente usa la service account asociada
   export async function generateVideo(prompt: string) {
     const aiplatform = new PredictionServiceClient();
     // No necesitas autenticación explícita
   }
   ```

2. **Asocia service account:**
   ```bash
   gcloud run deploy veo-video-generator \
     --service-account=veo-video-generator@curios-vertex.iam.gserviceaccount.com
   ```

3. **Frontend llama a Cloud Run:**
   ```typescript
   // Frontend
   const response = await fetch('https://veo-generator-xxx.run.app/generate', {
     method: 'POST',
     body: JSON.stringify({ prompt: 'eagle flying' })
   });
   ```

---

## 🚀 PLAN RECOMENDADO (PASO A PASO)

### Fase 1: Desarrollo Local (AHORA)

1. ✅ Usar tu cuenta `marcelo@curiosai.com`
2. ✅ Test con `gcloud auth application-default`
3. ✅ Probar generación de videos
4. ✅ Desarrollar código TypeScript

### Fase 2: Backend Prototype

**Opción A: Supabase Edge Function** (más complejo sin JSON key)
- ⚠️ Requiere workaround o external auth service

**Opción B: Cloud Run Function** (más simple)
- ✅ Workload Identity automático
- ✅ Service account sin keys
- ✅ Escalable

### Fase 3: Producción

1. Deploy a Cloud Run
2. Workload Identity configurado
3. Frontend → Cloud Run → Vertex AI

---

## 💡 DECISIÓN INMEDIATA

**¿Qué quieres hacer ahora?**

### Opción A: Desarrollo Local (testing rápido)
```bash
# Usar tu cuenta personal
gcloud auth application-default login

# Crear test con Node.js que use ADC (Application Default Credentials)
# Funciona en local, no en producción
```

### Opción B: Service Account Impersonation (más robusto)
```bash
# Dar permisos de impersonación
# Más pasos pero más cercano a producción
```

### Opción C: Cloud Run desde el inicio (production-ready)
```bash
# Crear Cloud Run Function
# Más complejo pero solución final
```

---

## 🎯 MI RECOMENDACIÓN

**Para empezar YA y probar Veo:**

1. **Ahora (10 minutos):** Usa **Opción A** - Tu cuenta personal
   - Test funcional inmediato
   - Valida que Veo funciona
   - Desarrolla lógica de negocio

2. **Después (1-2 horas):** Implementa **Opción C** - Cloud Run
   - Backend production-ready
   - Sin keys, sin problemas de seguridad
   - Escalable y mantenible

¿Con cuál empezamos?
