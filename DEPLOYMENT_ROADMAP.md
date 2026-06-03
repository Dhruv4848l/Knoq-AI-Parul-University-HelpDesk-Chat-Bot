# 🚀 Knoq-AI Deployment Roadmap
### Frontend → Vercel · Backend → Render

> **Estimated time:** 30–45 minutes for full deployment from scratch.

---

## 📋 Pre-Deployment Checklist

Before starting, make sure you have all of these:

- [ ] **GitHub repo** pushed with latest code
- [ ] **MongoDB Atlas** cluster running (get free at [mongodb.com/atlas](https://www.mongodb.com/atlas))
- [ ] **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)
- [ ] **Vercel account** (free at [vercel.com](https://vercel.com))
- [ ] **Render account** (free at [render.com](https://render.com))
- [ ] All environment variables ready (see [.env.example](./.env.example))

---

## Architecture After Deployment

```
┌──────────────────────────────┐      HTTPS      ┌──────────────────────────────┐
│    Vercel (Frontend)         │ ◄────────────── │     User's Browser           │
│    https://knoq-ai.vercel.app│                  └──────────────────────────────┘
│    React 19 + Vite static    │
│    CDN edge delivery         │      API calls (JWT)
└──────────────┬───────────────┘ ──────────────►  ┌──────────────────────────────┐
               │                                   │    Render (Backend)           │
               │                                   │    https://knoq-ai.onrender.com│
               │                                   │    Node.js + Express.js       │
               │                                   └──────────────┬───────────────┘
               │                                                  │
               │                                    ┌─────────────▼──────────────┐
               │                                    │    MongoDB Atlas            │
               │                                    │    Cloud Database           │
               │                                    └────────────────────────────┘
               │
          ┌────▼──────────────────────────────┐
          │    External APIs (all direct)      │
          │    Google Gemini · Maps · Firecrawl│
          └───────────────────────────────────┘
```

---

## 🖥️ STEP 1: Deploy Backend to Render

### 1.1 · Push Your Code to GitHub

```bash
# From project root
git add .
git commit -m "chore: prepare for Render deployment"
git push origin main
```

### 1.2 · Create a New Render Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your **GitHub repository**
3. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `knoq-ai-backend` |
| **Region** | `Oregon (US West)` or closest to your users |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | `Free` (or Starter for always-on) |

### 1.3 · Add Environment Variables on Render

In the Render dashboard → your service → **Environment** tab, add each of these:

```
PORT                  = 5000           # Render overrides this automatically
NODE_ENV              = production
MONGODB_URI           = mongodb+srv://username:password@cluster.mongodb.net/knoq-ai
JWT_SECRET            = <generate a 64-char random string>
GEMINI_API_KEY        = AIzaSy...
GEMINI_API_KEY_2      = AIzaSy...      (optional)
GEMINI_API_KEY_3      = AIzaSy...      (optional)
DEEPSEEK_API_KEY      = sk-...         (optional)
GOOGLE_MAPS_API_KEY   = AIzaSy...
FIRECRAWL_API_KEY     = fc-...
FRONTEND_URL          = https://knoq-ai.vercel.app   ← set AFTER Vercel deploy
```

> **💡 Generate JWT Secret:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 1.4 · Fix MongoDB Atlas Network Access

MongoDB Atlas only allows connections from whitelisted IPs. For Render:

1. Go to **MongoDB Atlas** → **Network Access**
2. Click **Add IP Address**
3. Select **Allow Access from Anywhere** (`0.0.0.0/0`)
   > ⚠️ This is acceptable for the free tier. For production, use Render's static IPs.
4. Click **Confirm**

### 1.5 · Deploy & Verify

Click **Deploy** on Render. Watch the build logs.

✅ Success looks like:
```
[server] Connected to MongoDB
[AI] Loaded 2 Gemini API key(s)
[server] Server running on port 10000
```

Note your **Render service URL**: `https://knoq-ai-backend.onrender.com`

> **⚠️ Free Tier Note:** Render free services spin down after 15 minutes of inactivity. The first request after sleep takes ~30s. Upgrade to "Starter" ($7/mo) for always-on.

---

## 🌐 STEP 2: Deploy Frontend to Vercel

### 2.1 · Configure the API Base URL

Before deploying, the frontend must point to your Render backend URL.

**Option A: Environment Variable (Recommended)**

Create `frontend/.env.production`:
```env
VITE_API_BASE_URL=https://knoq-ai-backend.onrender.com/api
```

Then update `frontend/src/api/client.js`:
```js
// Change:
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
```

**Option B: Vercel Environment Variable**

Skip the file and set `VITE_API_BASE_URL` directly in Vercel's dashboard (see step 2.4).

### 2.2 · Add vercel.json for SPA Routing

Create `frontend/vercel.json` (fixes React Router on page refresh):

```json
{
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2.3 · Create a New Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repository
3. Configure the project:

| Setting | Value |
|---|---|
| **Project Name** | `knoq-ai` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 2.4 · Add Environment Variables on Vercel

In Vercel → Project → **Settings** → **Environment Variables**:

```
VITE_API_BASE_URL = https://knoq-ai-backend.onrender.com/api
```

Set for **Production**, **Preview**, and **Development**.

### 2.5 · Deploy

Click **Deploy**. Vercel will:
1. Install dependencies
2. Run `vite build`
3. Deploy static files to global CDN

✅ Your frontend is live at: `https://knoq-ai.vercel.app`

### 2.6 · Update CORS on Render

Now that you have your Vercel URL, go back to **Render** → your backend service → **Environment** → update:

```
FRONTEND_URL = https://knoq-ai.vercel.app
```

Then **redeploy** the backend (Render → Manual Deploy).

---

## ✅ STEP 3: Verify Full-Stack Deployment

### End-to-End Smoke Test

Run these checks in order:

```bash
# 1. Backend health check
curl https://knoq-ai-backend.onrender.com/
# Expected: {"message": "Welcome to Knoq-AI API"}

# 2. CORS check (from browser console on your Vercel URL)
fetch('https://knoq-ai-backend.onrender.com/api/faqs')
  .then(r => r.json())
  .then(console.log)

# 3. Auth test
curl -X POST https://knoq-ai-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@paruluniversity.ac.in","password":"Test123!"}'
```

### Frontend Verification Checklist

| Page | URL | Check |
|---|---|---|
| Landing | `/` | 3D hero loads, chat panel works |
| Free Chat | `/` (scroll) | FAQ responses without login |
| Login | `/login` | Can log in with test account |
| Chat App | `/app` | AI responses with citations |
| Profile | `/profile` | Branch/semester saves |
| Docs | `/docs` | RAG pipeline diagram renders |
| Cache | `/cache` | Latency bars display |
| Admin | `/admin` | Accessible with admin role |

---

## 🔧 STEP 4: Post-Deployment Configuration

### 4.1 · Grant Admin Access

After deploying, log in with your university email, then in MongoDB Atlas:

```js
// In Atlas Data Explorer or Compass
db.users.updateOne(
  { email: "your@paruluniversity.ac.in" },
  { $set: { role: "admin" } }
)
```

### 4.2 · Seed Campus Data

After backend is live:
```bash
# Point to production
MONGODB_URI=mongodb+srv://... node backend/scripts/ingestDatasets.js
```

### 4.3 · Set up MongoDB Vector Search Index

In MongoDB Atlas → your cluster → **Search** → **Create Index**:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

Apply to both `scrapedpages` and `brochurepages` collections.

---

## ⚡ STEP 5: Performance Optimization

### Keep Render Alive (Free Tier)

Use a free uptime service to prevent cold starts:

**Option A: UptimeRobot (Free)**
1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: HTTP(s) → `https://knoq-ai-backend.onrender.com/`
3. Set interval: every **5 minutes**

**Option B: GitHub Actions Cron Pinger**

Create `.github/workflows/keep-alive.yml`:
```yaml
name: Keep Render Alive
on:
  schedule:
    - cron: '*/14 * * * *'   # Every 14 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping backend
        run: curl -s https://knoq-ai-backend.onrender.com/ > /dev/null
```

### Vercel Domain (Optional)

In Vercel → **Domains** → Add your custom domain:
```
knoq.paruluniversity.ac.in
```

Add the CNAME record in your DNS provider pointing to `cname.vercel-dns.com`.

---

## 🔁 Continuous Deployment

Both Vercel and Render support automatic deployments on `git push`:

```
Developer pushes to GitHub main
         │
    ┌────┴────────────────────┐
    │                         │
    ▼                         ▼
Vercel auto-builds        Render auto-builds
frontend/dist             backend (node server.js)
    │                         │
    ▼                         ▼
Deploy to CDN         Deploy new web service instance
(~60 seconds)              (~2 minutes)
```

To trigger manual redeploy:
- **Vercel**: Dashboard → Deployments → **Redeploy**
- **Render**: Dashboard → your service → **Manual Deploy**

---

## 🌍 Environment Summary

| Variable | Local | Render (Prod) | Where to set |
|---|---|---|---|
| `PORT` | 5000 | Auto (10000) | Render auto-sets |
| `NODE_ENV` | development | production | Render env vars |
| `MONGODB_URI` | Local/Atlas | Atlas | Render env vars |
| `JWT_SECRET` | any string | 64-char random | Render env vars |
| `GEMINI_API_KEY` | your key | your key | Render env vars |
| `FRONTEND_URL` | http://localhost:5173 | https://knoq-ai.vercel.app | Render env vars |
| `VITE_API_BASE_URL` | http://localhost:5000/api | https://knoq-ai-backend.onrender.com/api | Vercel env vars |

---

## 🆘 Troubleshooting

### CORS Errors
```
Access to fetch at 'https://...' has been blocked by CORS policy
```
**Fix:** Ensure `FRONTEND_URL` on Render exactly matches your Vercel URL (no trailing slash).

### MongoDB Connection Timeout
```
MongooseServerSelectionError: connection timed out
```
**Fix:** Add `0.0.0.0/0` to MongoDB Atlas Network Access whitelist.

### Render 502 Bad Gateway
```
502 Bad Gateway
```
**Fix:** Service is waking from sleep (free tier). Wait 30 seconds and retry. Or upgrade to Starter.

### Vite Build Fails on Vercel
```
Error: Cannot find module '@rolldown/binding-win32-x64-msvc'
```
**Fix:** The Windows-specific binding is in devDependencies. Add to `frontend/package.json`:
```json
"engines": { "node": ">=18" }
```
And in Vercel settings, set Node.js version to `18.x`.

### Environment Variables Not Loading
```
[AI] Loaded 0 Gemini API key(s)
```
**Fix:** Ensure env vars are set in Render → Environment (not in code). Redeploy after adding.

---

## 📊 Cost Summary (Free Tier)

| Service | Free Tier Limit | Upgrade Cost |
|---|---|---|
| **Vercel** | Unlimited static + 100GB bandwidth | $20/mo Pro |
| **Render** | 750 hrs/mo, sleeps after 15min | $7/mo Starter |
| **MongoDB Atlas** | 512MB storage | $57/mo M10 |
| **Gemini API** | 15 req/min, 1M tokens/day | Pay-as-you-go |
| **Firecrawl** | 500 pages/mo | $16/mo Hobby |

**Total free tier cost: $0/month** ✅

---

<div align="center">

**🎓 Knoq-AI is ready to help every Parul University student, 24/7.**

[📖 Back to README](./README.md)

</div>
