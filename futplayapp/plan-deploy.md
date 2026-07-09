# Plan de Deploy — FutplayApp

## 1. Vercel — Producción

- [x] `rootDirectory` configurado como `futplayapp` (vía API)
- [x] Env vars (10) configuradas en Dashboard
- [x] `vercel.json` eliminado del remoto (contenía `rootDirectory` inválido)
- [x] Commit + push de cambios a `deploy-main`
- [x] Build local exitoso (Next.js compila, TypeScript pasa)
- [ ] `productionBranch` cambiado de `main` a `deploy-main` en Dashboard
- [ ] Verificar que el deployment funciona (entrar al deploy desde Dashboard)
- [ ] Desactivar SSO/Deployment Protection (o agregar dominio personalizado)

## 2. Supabase — Base de Datos

- [ ] Verificar migraciones SQL aplicadas (tablas, RLS, triggers, enums)
- [ ] Storage buckets creados: `capsulas`, `modulos_miniaturas`, `modulos_documentos`
- [ ] RLS policies verificadas para todas las tablas

## 3. Google Auth (Supabase Auth)

- [ ] Site URL: cambiar de `http://localhost:3000` a `https://futplay-app.vercel.app`
- [ ] Redirect URLs: agregar `https://futplay-app.vercel.app/**`
- [ ] Google Cloud Console: agregar `https://futplay-app.vercel.app` a Authorized JS origins

## 4. Flow.cl (Pagos)

- [ ] Verificar que `NEXT_PUBLIC_BASE_URL` apunte a `https://futplay-app.vercel.app`
- [ ] Webhook URL en Flow.cl: `https://futplay-app.vercel.app/api/flow/webhook`
- [ ] Return URL en Flow.cl: `https://futplay-app.vercel.app/dashboard?flowSuccess=1`
- [ ] `NEXT_PUBLIC_FLOW_SANDBOX=true` para pruebas (cambiar a `false` en producción real)

## 5. WhatsApp Bot

- [ ] Opción A: Hostear `webhook/server.js` en VPS separado (recomendado)
- [ ] Opción B: Mantener local con Serveo tunnel (temporal)
- [x] `SCHEDULER_ENABLED=false` en Vercel (deshabilitado)

## 6. Post-Deploy — Checklist de verificación

- [ ] Home/Landing funciona (`/home`)
- [ ] Login con Google funciona (`/login`)
- [ ] Redirección por rol funciona (`/dashboard`, `/admin`)
- [ ] Planes y Flow.cl: flujo de pago completo
- [ ] Mis Clases: calendario, inscripción, cancelación
- [ ] Cápsulas: reproductor de video Bunny, comentarios
- [ ] Admin: CRUD de clases, cápsulas, usuarios
- [ ] Perfil de usuario: datos correctos
