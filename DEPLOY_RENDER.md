# Deploy Game Mania to Render

This project is configured to deploy as a single Render Web Service. The Node.js server serves both the Socket.io API and the built React client.

## Quick deploy (Render Blueprint)

1. Push this repository to GitHub:

```bash
git init
git add .
git commit -m "Initial Game Mania deploy"
git branch -M main
git remote add origin https://github.com/Keerthan7294/game-mania.git
git push -u origin main
```

2. Click the button below to deploy via Render Blueprint:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/blueprints?repo=https://github.com/Keerthan7294/game-mania)

3. Render will create a free Web Service from `render.yaml`.

4. Once deployed, copy your service URL (e.g. `https://game-mania-xyz.onrender.com`).

## Manual deploy (Render Dashboard)

1. Push this repo to GitHub as shown above.
2. Go to https://dashboard.render.com and sign in.
3. Click **New → Web Service**.
4. Connect your GitHub repository.
5. Use these settings:

| Setting | Value |
|---------|-------|
| Name | game-mania |
| Runtime | Node |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

6. Click **Create Web Service**.

## Environment variables

No special variables are required. The client auto-detects the server URL from `window.location.origin` in production.

Optional variables:

| Variable | Purpose |
|----------|---------|
| `PORT` | Render sets this automatically |
| `VITE_SERVER_URL` | Only needed if you split frontend/backend onto separate services |

## After deployment

- **Console URL:** `https://your-service.onrender.com/console`
- **Controller URL:** `https://your-service.onrender.com/play?room=XXXXX`
- **APK download:** `https://your-service.onrender.com/download`

> Note: Render free Web Services "spin down" after 15 minutes of inactivity. The first visit may take 30-60 seconds to wake up. For always-on hosting, upgrade to a paid plan.

## Updating the APK for the Render URL

The included `GameMania-debug.apk` points to whichever server URL was active at build time. To rebuild it for Render:

```bash
cd client
set VITE_SERVER_URL=https://your-service.onrender.com
npm run build
npx cap sync android
cd android
gradlew.bat assembleDebug
copy app\build\outputs\apk\debug\app-debug.apk ..\..\GameMania-debug.apk
```

Then commit and push the updated APK if you want Render to serve the new version.
