# 🎮 Velocity Verse — Vercel Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────┐        ┌──────────────────────────────┐
│  VERCEL (Frontend)              │        │  RENDER (Backend)            │
│  velocity-verse.vercel.app      │◄──────►│  your-backend.onrender.com   │
│                                 │        │                              │
│  • React + Three.js game        │        │  • Socket.io relay server    │
│  • /phone route (controller)    │        │  • Path: /api/socket.io      │
│  • Vite build                   │        │  • Connects game ↔ phone     │
└─────────────────────────────────┘        └──────────────────────────────┘
```

**Key point:** Both the game AND the phone controller page live on Vercel.
The QR code links your phone to the same Vercel URL (`/phone?session=...`).
Render only handles the Socket.io relay — it never serves HTML.

---

## ✅ Root Causes of the 404/Connectivity Issue (Fixed)

The problems you hit were:

1. **Wrong socket path** — The backend mounts Socket.io at `/api/socket.io`.
   The frontend socket.ts now connects directly to `VITE_BACKEND_URL` with
   `path: "/api/socket.io"` — no proxy, no guessing.

2. **Wrong phone URL** — The QR code must link to your **Vercel frontend** URL
   (`https://your-game.vercel.app/phone?session=...`), not the backend.
   This is now computed from `window.location.origin` automatically.

3. **SPA routing** — Vercel needs `vercel.json` with rewrites so `/phone` doesn't
   404. This is already included.

---

## STEP 1 — Push Frontend to GitHub

```bash
# Inside the velocity-verse/ folder:
git init
git add .
git commit -m "Initial: Velocity Verse frontend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/velocity-verse-frontend.git
git push -u origin main
```

---

## STEP 2 — Check Your Render Backend is Running

Before deploying the frontend, confirm your backend is alive:

1. Open: `https://YOUR-BACKEND.onrender.com/api/health`
2. You should see: `{"status":"ok","service":"velocity-verse-backend"}`
3. If you see a 404 or error — the backend needs to be redeployed (see section below)

### ⚠️ Render Free Tier Sleeping
Free Render services sleep after 15 minutes idle. The first connection after sleep
takes ~30 seconds. During this time the phone controller won't connect, but keyboard
controls always work. To avoid this: upgrade to Render Starter ($7/mo).

### Backend 404 Fix (if needed)
If `/api/health` gives 404, your backend's `app.ts` might be missing the health route.
Make sure it has:
```typescript
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "velocity-verse-backend" });
});
```
And Socket.io must be at path `/api/socket.io` in `socketRelay.ts`:
```typescript
const io = new Server(httpServer, {
  path: "/api/socket.io",
  cors: { origin: "*", methods: ["GET", "POST"] },
});
```

---

## STEP 3 — Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) → Sign up (free, use GitHub login)
2. Click **Add New → Project**
3. Import your `velocity-verse-frontend` GitHub repository
4. Vercel auto-detects Vite. Confirm these settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `velocity-verse` ← **important if repo has both folders**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Before clicking Deploy** → expand **Environment Variables** and add:
   ```
   Name:  VITE_BACKEND_URL
   Value: https://YOUR-BACKEND.onrender.com
   ```
   (No trailing slash. Get this URL from your Render dashboard.)
6. Click **Deploy**
7. In ~2 minutes your game is live at `https://velocity-verse-xxxxx.vercel.app`

### Option B: Vercel CLI

```bash
npm install -g vercel
cd velocity-verse
vercel login
vercel --prod
# When prompted for env var, enter VITE_BACKEND_URL
```

---

## STEP 4 — Verify Everything Works

### Test 1: Game loads
Open your Vercel URL → you should see the 3D home screen.

### Test 2: Phone route works
Open `https://your-game.vercel.app/phone?session=test` on your phone →
you should see the "Syncing with game…" screen (not a 404).

### Test 3: Backend connected
Open browser DevTools (F12) → Console tab.
You should see: `[Socket] Connected to backend: https://your-backend.onrender.com`
If you see `[Socket] Connection error` → double-check `VITE_BACKEND_URL` in Vercel env vars.

### Test 4: Full phone pairing
1. Open game on desktop → pick character → enter name → reach QR screen
2. Scan QR with phone → phone shows "SYNCING WITH GAME…" then "CONNECTED!"
3. Game starts counting down 3-2-1

---

## STEP 5 — Custom Domain (Optional, Free)

In Vercel dashboard → your project → **Settings → Domains**:
- Add `velocityverse.yourdomain.com` or buy a domain from Vercel

---

## Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_BACKEND_URL` | YES | `https://velocity-verse-api.onrender.com` | Your Render backend URL |

Set in: **Vercel → Project → Settings → Environment Variables**

---

## Re-deploying After Code Changes

```bash
git add .
git commit -m "Your change"
git push
```
Vercel auto-deploys on every push to `main`. Takes ~90 seconds.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `/phone` gives 404 | `vercel.json` missing | Already included — make sure it's committed |
| Phone can't connect | Wrong `VITE_BACKEND_URL` | Check Vercel env vars, no trailing slash |
| Phone can't connect | Backend sleeping | Wait 30s for Render to wake up |
| Phone can't connect | Wrong socket path | Backend must use `path: "/api/socket.io"` |
| QR links to wrong URL | Bug in QRConnect | Fixed — now uses `window.location.origin` |
| Game loads but 3D is black | WebGL blocked | Try Chrome, disable hardware acceleration blockers |
| Score not saving | localStorage | Works in all browsers automatically |

---

## Controls Reference

| Action | Keyboard | Phone Touch | Phone Motion |
|--------|----------|-------------|--------------|
| Left lane | A / ← | ◀ button | Tilt left >10° |
| Right lane | D / → | ▶ button | Tilt right >10° |
| Jump | Space / W / ↑ | ▲ button | Flick down |
| Slide | S / ↓ | ▼ button | Flip face-down |

**Motion sensitivity is unchanged from original.**

---

## Local Development

```bash
cd velocity-verse
cp .env.example .env.local
# Edit .env.local: set VITE_BACKEND_URL=http://localhost:3001
npm install
npm run dev
# Game runs at http://localhost:5173
```

Start backend separately:
```bash
cd backend
npm install
npm run dev
# Backend runs at http://localhost:3001
```
