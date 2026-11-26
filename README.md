# 🎮 Game Mania

An **AirConsole-style** two-screen party gaming platform with a flagship co-op physics game: **Raft Blast Co-Op**.

## Architecture

- **Console Screen** (`/console`) — Hosts the party room, displays QR code + room code, and runs the full 3D game.
- **Phone Controller** (`/play?room=CODE`) — Joins as a touch controller with dynamic layouts, haptics, and Web Audio SFX.
- **Server** — Node.js + Express + Socket.io room manager, instant input relay, and 20Hz game-state broadcast.

## Project Structure

```
/server              Node.js + Socket.io server
/client              Vite + React front-end
  /src/console       Console (TV) UI + Three.js/cannon-es games
  /src/controller    Mobile controller app
/shared              Shared constants between client & server
```

## Quick Start

### 1. Start the server

```bash
cd server
npm install
npm start
```

### 2. Start the client dev server

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

### 3. Play

- Open **http://localhost:5173/console** on the host display (TV / laptop / tablet).
- Scan the QR code with your phone, or open **http://localhost:5173/play?room=XXXXX** in a mobile browser.
- On the host, the Party Leader (first connected player) can pick **Raft Blast Co-Op** and launch the game.

### Running over Wi-Fi

The QR code in dev mode points to `localhost`, which only works on the same computer. For phones on the same Wi-Fi:

1. Find your computer's local IP, e.g. `192.168.1.42`.
2. Open **http://192.168.1.42:5173/console** on the host display.
3. Open **http://192.168.1.42:5173/play?room=XXXXX** on each phone.

If your firewall blocks port 5173, run the client on port 80 or use the production server on port 3000:

```bash
cd client
npm run build
cd ../server
set EXTERNAL_HOST=http://192.168.1.42:3000
npm start
```

Then visit **http://192.168.1.42:3000/console** and **http://192.168.1.42:3000/play?room=XXXXX**.

## Games

| Game | Players | Status |
|------|---------|--------|
| Raft Blast Co-Op | 2–4 | ✅ Playable |
| Bumper Arena | 2–6 | 🔌 Placeholder |
| Sync Dash | 2–4 | 🔌 Placeholder |

## Controls: Raft Blast Co-Op

- **Slide Left / Right** — Move your character counter-clockwise or clockwise around the raft rim.
- **Blast** — Hold to fire a thrust vector inward from your rim position, propelling the raft opposite to where you sit.
- **Co-op tip** — Coordinate opposite-side blasts to go straight; same-side blasts to spin!

## Deploy to Render (recommended for permanent hosting)

The project includes a Render Blueprint (`render.yaml`) for one-click deployment.

1. Push this repo to GitHub.
2. Click **Deploy to Render**:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/blueprints?repo=https://github.com/Keerthan7294/game-mania)

3. Render creates a free Node.js Web Service that hosts both the server and the built client.

After deploy:

- **Console:** `https://your-service.onrender.com/console`
- **Controller:** `https://your-service.onrender.com/play?room=XXXXX`
- **APK download:** `https://your-service.onrender.com/download`

See `DEPLOY_RENDER.md` for detailed manual deploy steps.

## Hosting publicly (temporary tunnel)

To expose the local server over the internet right away:

```bash
cd server
set USE_TUNNEL=1
npm start
```

The terminal will print a public URL like `https://xxxx.loca.lt`:

- **Public Console:** `https://xxxx.loca.lt/console`
- **Public Controller:** `https://xxxx.loca.lt/play?room=XXXXX`

Phones can open the controller URL directly, or scan the QR code shown on the console.

> Note: `loca.lt` tunnels are temporary and show a warning page on first visit. Tap through it, or use Render for production.

## Install as a mobile app (PWA)

The controller is already a Progressive Web App:

1. Open the public controller URL in Chrome/Samsung Internet on Android or Safari on iOS.
2. Tap **Add to Home Screen** / **Install**.
3. The game opens fullscreen in landscape, just like a native app.

## Build a native Android APK

The project includes a configured **Capacitor** Android project at `client/android/`.

### 1. Point the app at your hosted server

```bash
cd client
set VITE_SERVER_URL=https://your-server-url.com
npm run build
npx cap sync android
```

> If you are using the temporary tunnel, replace `https://your-server-url.com` with the tunnel URL printed by the server.

### 2. Build the APK

You need **Android Studio** and a JDK installed.

```bash
cd client/android
./gradlew assembleDebug
```

On Windows:

```cmd
cd client\android
gradlew.bat assembleDebug
```

The APK will be at:

```
client/android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Install on phones

Transfer the APK to your Android phone and install it. Make sure **Install from unknown sources** is enabled for your file manager/browser.

## Tech Stack

- Node.js, Express, Socket.io
- React 18, React Router, Vite
- Capacitor (Android native wrapper)
- Three.js, cannon-es
- Web Audio API, Navigator.vibrate(), Screen Wake Lock API

## License

MIT
