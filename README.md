# AutoTube 🚀

AI-powered faceless YouTube channel automation with monetization features.

> AutoTube creates, renders, and uploads AI-generated YouTube videos automatically.

## Features

- **Video Pipeline**: Trends → Script → Voice → Video → Render → Upload
- **High-RPM Niches**: Finance ($12), Business ($15), Tech ($10), Real Estate ($18)
- **Monetization**: AdSense + Affiliate CTAs + SEO optimization
- **Analytics**: Viral score tracking + niche performance

## Quick Start (Local)

```bash
# Backend
npm install
npm run dev

# Frontend (new terminal)
cd client
npm install
npm run dev
```

## Deploy Online

### Option 1: Vercel + Render (Recommended - Free Tier)

#### Step 1: Deploy Backend to Render

1. Go to [render.com](https://render.com) → Sign up/Login
2. Click **New +** → **Blueprint**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` - click **Apply**
5. Add Environment Variables:
   - `MONGODB_URI` - Get free cluster at [MongoDB Atlas](https://mongodb.com/atlas)
   - `GROQ_API_KEY` - Get at [console.groq.com](https://console.groq.com)
   - `YOUTUBE_API_KEY` - YouTube Data API v3 from Google Cloud Console
   - `YT_CLIENT_ID` - OAuth2 from Google Cloud Console
   - `YT_CLIENT_SECRET` - OAuth2 from Google Cloud Console
   - `YT_REDIRECT_URI` - `https://your-render-url.onrender.com/api/youtube/callback`
   - `FRONTEND_URL` - `https://your-vercel-url.vercel.app`
6. Click **Create Blueprint**

#### Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up/Login with GitHub
2. Click **Add New** → **Project**
3. Import `youtube-ai-platform/client` folder
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://your-render-url.onrender.com/api`
5. Click **Deploy**

#### Step 3: Update Render CORS

1. In Render dashboard, update `FRONTEND_URL` to your Vercel URL
2. Redeploy backend

### Option 2: Railway + Vercel

1. Deploy backend to [Railway](https://railway.app) - similar process
2. Set same environment variables
3. Deploy frontend to Vercel

## Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
SERVERLESS=true
MONGODB_URI=mongodb+srv://...
GROQ_API_KEY=gsk_...
YOUTUBE_API_KEY=AIza...
YT_CLIENT_ID=xxx.apps.googleusercontent.com
YT_CLIENT_SECRET=GOCSPX-...
YT_REDIRECT_URI=https://your-backend.onrender.com/api/youtube/callback
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trends` | Get YouTube trends |
| POST | `/api/script/generate` | Generate AI script |
| POST | `/api/voice/generate` | Generate TTS voice |
| POST | `/api/video/download` | Download stock video |
| POST | `/api/render/video` | Render final video |
| POST | `/api/pipeline/run` | Run full pipeline |
| GET | `/api/monetization/niches` | Get high-RPM niches |
| GET | `/api/monetization/earnings` | Estimate earnings |

## Tech Stack

- **Backend**: Node.js, Express, MongoDB, Groq AI
- **Frontend**: React, Tailwind CSS, Vite
- **Video**: FFmpeg, Pexels API
- **AI**: Groq (LLM), Google TTS (Voice)

## Demo URLs

After deployment, your app will be at:
- Frontend: `https://youtube-ai-platform.vercel.app`
- Backend API: `https://youtube-ai-platform.onrender.com`

## License

MIT
