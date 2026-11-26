# Build Game Mania Android APK

The Android project is already configured with Capacitor at `client/android/`.

## One-time setup

1. Install **Android Studio** from https://developer.android.com/studio
2. Install a **JDK** (JDK 17 recommended): https://adoptium.net/
3. Set environment variables:

```powershell
# PowerShell (run as Administrator or add to User env)
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LocalAppData\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17", "User")
```

> Restart your terminal after setting environment variables.

## Build debug APK

### Option A: Use Android Studio (recommended)

1. Open Android Studio.
2. Choose **Open** and select the `client/android` folder.
3. Wait for Gradle sync to finish.
4. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. The APK path appears in the bottom-right notification: `app-debug.apk`.

### Option B: Command line

```bash
cd client/android
./gradlew assembleDebug
```

On Windows:

```cmd
cd client\android
gradlew.bat assembleDebug
```

Output:

```
client/android/app/build/outputs/apk/debug/app-debug.apk
```

## Point the app at your server

Before building, tell the app where your server is hosted.

```bash
cd client
set VITE_SERVER_URL=https://your-server-url.com
npm run build
npx cap sync android
```

Then build the APK.

## Install on Android

1. Transfer `app-debug.apk` to the phone.
2. Open it from a file manager.
3. Allow installation from unknown sources if prompted.
4. Launch **Game Mania**.

## Notes

- The controller works best in landscape. The app forces landscape automatically.
- The app requests screen wake-lock so the phone does not sleep during play.
