# Building APK for Android Device

This guide explains how to build an APK file that can be installed on a real Android device.

## Quick Start (Debug APK - Easiest)

For quick testing on a real device, build a debug APK:

```bash
cd android
./gradlew assembleDebug
```

The APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Building Release APK (Recommended for Testing)

### Option 1: Using Debug Keystore (Current Setup)

The project is currently configured to use the debug keystore for release builds. This is fine for testing:

```bash
cd android
./gradlew assembleRelease
```

The APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Option 2: Create a Release Keystore (For Production)

**⚠️ Important:** For production apps, you should create your own keystore and keep it secure.

1. **Generate a keystore:**
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted to enter:
- Keystore password (remember this!)
- Key password (can be same as keystore)
- Your name, organization, etc.

2. **Update `android/gradle.properties`** to add your keystore info:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your-keystore-password
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

3. **Update `android/app/build.gradle`** signing config:
```gradle
signingConfigs {
    release {
        if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // ... rest of config
    }
}
```

## Installing the APK on Your Device

### Method 1: Using ADB (Android Debug Bridge)

1. **Enable USB Debugging** on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings > Developer Options
   - Enable "USB Debugging"

2. **Connect your device** via USB

3. **Install the APK:**
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Method 2: Transfer and Install Manually

1. **Transfer the APK** to your device:
   - Email it to yourself
   - Use cloud storage (Google Drive, Dropbox, etc.)
   - Use USB file transfer

2. **On your device:**
   - Open the APK file
   - Allow installation from unknown sources if prompted
   - Tap "Install"

## Building from Project Root

You can also build from the project root:

```bash
# Debug APK
npm run android -- --mode=release --variant=debug

# Or use Gradle directly
cd android && ./gradlew assembleDebug
cd android && ./gradlew assembleRelease
```

## Troubleshooting

### "Execution failed for task ':app:mergeReleaseResources'"
- Clean the build: `cd android && ./gradlew clean`
- Rebuild: `cd android && ./gradlew assembleRelease`

### "Keystore file not found"
- Make sure the keystore path in `gradle.properties` is correct
- Use relative path from `android/app/` directory

### APK won't install on device
- Check if you have an older version installed - uninstall it first
- Make sure "Install from Unknown Sources" is enabled
- Check device architecture matches APK (most modern devices are arm64-v8a)

## Building AAB (Android App Bundle) for Play Store

For Google Play Store distribution, build an AAB instead:

```bash
cd android
./gradlew bundleRelease
```

The AAB will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Notes

- **Debug APK**: Larger file size, includes debug symbols, easier to build
- **Release APK**: Optimized, smaller size, requires signing
- **Current Setup**: Release builds use debug keystore (fine for testing, not for production)
- **VPN Testing**: Remember that VPN functionality requires a physical device - emulators don't support it

