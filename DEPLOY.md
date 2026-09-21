# 🚀 Guía de Despliegue — P2P Tracker

## Stack
- **Frontend / API Routes**: Next.js 14 (App Router) → Vercel
- **Base de datos + Auth**: Supabase (PostgreSQL + RLS)
- **Dominio sugerido**: `p2p.infinitychanges.com`

---

## Paso 1: Crear proyecto en Supabase

1. Ve a https://supabase.com/dashboard y crea un **nuevo proyecto**  
   - Nombre: `infinity-p2p-tracker`
   - Región: US East (o la más cercana a Venezuela)
   - Guarda la **DB Password**

2. En el proyecto → **SQL Editor** → pega y ejecuta `supabase/schema.sql`

3. Copia tus credenciales en **Settings → API**:
   - `Project URL`
   - `anon public` key
   - `service_role` key (solo para el servidor)

---

## Paso 2: Variables de entorno

Copia `.env.local.example` → `.env.local` y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://p2p.infinitychanges.com
```

---

## Paso 3: Subir a GitHub

```bash
cd infinity-p2p-tracker
git init
git add .
git commit -m "feat: initial P2P Tracker scaffold"
git remote add origin https://github.com/TU_USUARIO/infinity-p2p-tracker.git
git push -u origin main
```

---

## Paso 4: Conectar con Vercel

1. Ve a https://vercel.com → **Add New Project**
2. Importa el repo `infinity-p2p-tracker`
3. En **Environment Variables**, agrega las 3 de Supabase + `NEXT_PUBLIC_APP_URL`
4. Click **Deploy** → Vercel construye y despliega automáticamente

---

## Paso 5: Dominio personalizado

En Vercel → tu proyecto → **Settings → Domains**:
- Agrega `p2p.infinitychanges.com`
- En tu proveedor DNS agrega un `CNAME` apuntando a `cname.vercel-dns.com`

---

## Paso 6: Configurar Supabase Auth

En Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://p2p.infinitychanges.com`
- **Redirect URLs**: 
  - `https://p2p.infinitychanges.com/auth/reset-password`
  - `http://localhost:3000/auth/reset-password`

---

## Desarrollo local

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Arquitectura de rutas

```
/                         → redirige a /dashboard
/auth/login               → Login
/auth/register            → Registro
/auth/forgot-password     → Recuperar contraseña
/dashboard                → Dashboard principal (KPIs + tasas + calc)
/cycles                   → Gestión de ciclos P2P
/api/p2p-rates?fiat=VES   → Proxy Binance P2P (server-side, resuelve CORS)
```

---

## Actualización de tasas P2P

Las tasas se obtienen en el servidor (`/api/p2p-rates`) y se cachean 60 segundos.
El cliente refresca cada 60 segundos automáticamente vía `useP2PRates`.

- Top 10 comerciantes Binance por fiat
- Promedio de precio de compra y venta
- Spread calculado

..
