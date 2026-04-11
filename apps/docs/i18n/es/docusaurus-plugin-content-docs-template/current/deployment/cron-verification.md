---
id: cron-verification
title: Verificación de Cron en Vercel
sidebar_label: Verificación Cron
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – Lista de Verificación

## 🎯 Respuesta Rápida a Tus Preguntas

### Pregunta 1: ¿Funciona en Vercel sin Trigger.dev?
**✅ SÍ** – El sistema está correctamente configurado para usar Vercel Crons cuando:
- `VERCEL=1` (establecido automáticamente por Vercel)
- Las variables de entorno de Trigger.dev **NO** están definidas

### Pregunta 2: ¿Cómo verificar que está funcionando?
**✅ Sigue los 4 pasos a continuación**

---

## 📊 Estado Actual de la Configuración

### ✅ Qué se ha corregido

| Componente | Estado | Detalles |
|-----------|--------|---------|
| `vercel.json` | ✅ **CORREGIDO** | Ahora incluye **los 3** cron jobs (antes solo 1) |
| `initialize-jobs.ts` | ✅ **CORREGIDO** | Ahora registra **los 3** trabajos (antes solo 2) |
| Endpoints de API | ✅ **OK** | Los 3 endpoints existen y funcionan |
| Documentación | ✅ **CREADA** | Nueva guía `CRON_JOBS.md` |

### 📋 Lista Completa de Cron Jobs

| # | Nombre del Trabajo | Endpoint | Programación | Propósito |
|---|--------------------|----------|-------------|-----------|
| 1 | Sincronización de Repositorio | `/api/cron/sync` | `*/5 * * * *` | Sincroniza contenido cada 5 minutos |
| 2 | Recordatorios de Renovación | `/api/cron/subscription-reminders` | `0 9 * * *` | Envía emails de recordatorio a las 9:00 diariamente |
| 3 | Limpieza de Expiración | `/api/cron/subscription-expiration` | `0 0 * * *` | Procesa suscripciones vencidas a la medianoche |

---

## 🔍 Proceso de Verificación en 4 Pasos

### Paso 1: Verificar el Dashboard de Vercel – Cron Jobs

**Plantilla de URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**Para awesome-time-tracking-website:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Qué buscar:**
- [ ] Muestra **3 cron jobs** (no solo 1)
- [ ] Cada uno tiene la programación correcta
- [ ] Todos muestran estado "Activo"

**Resultado esperado:**

| Ruta | Programación | Estado |
|------|-------------|--------|
| `/api/cron/sync` | Cada 5 minutos | ✅ Activo |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ Activo |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ Activo |

---

### Paso 2: Verificar los Logs de Vercel

**Plantilla de URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**Verificar cada endpoint:**

#### A. Logs de Sincronización
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] Los logs aparecen cada 5 minutos
- [ ] Códigos de estado son 200 (éxito)
- [ ] Sin errores 401 (autenticación)
- [ ] Sin errores 500 (fallos)

#### B. Logs de Recordatorios
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] Los logs aparecen una vez al día a las 9:00
- [ ] Códigos de estado son 200 o 207 (éxito/éxito parcial)

#### C. Logs de Expiración
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] Los logs aparecen una vez al día a la medianoche
- [ ] Códigos de estado son 200 (éxito)

---

### Paso 3: Verificar los Logs de la Aplicación

#### Al Inicio de la Aplicación
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ Esto confirma:** El sistema detectó el entorno Vercel

#### En Cada Sincronización (cada 5 min.)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### En los Recordatorios de Renovación (diariamente a las 9:00)
```
[Cron] Subscription reminders job completed
```

#### En la Limpieza de Expiración (diariamente a la medianoche)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### Paso 4: Verificar las Variables de Entorno

**Requerida:**
```bash
CRON_SECRET=<definido-en-vercel>
```

**NO definidas (para usar Vercel, no Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<debe-estar-vacío>
TRIGGER_API_KEY=<debe-estar-vacío>
TRIGGER_API_URL=<debe-estar-vacío>
```

**Verificar mediante Vercel CLI:**
```bash
vercel env ls
```

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Solo 1 cron job visible en Vercel

**Causa:** Se desplegó el `vercel.json` antiguo  
**Solución:**
1. ✅ `vercel.json` está ahora corregido (3 crons)
2. Redesplegar en Vercel: `git push` o `vercel --prod`
3. Esperar 1-2 minutos para que Vercel registre los nuevos crons

---

### Problema 2: Errores 401 No Autorizado

**Causa:** `CRON_SECRET` no definido o no coincide  
**Solución:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### Problema 3: Los trabajos no se ejecutan en absoluto

**Causa:** Se está usando el modo Trigger.dev en lugar del modo Vercel

**Verificación:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
