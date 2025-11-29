# Factify APK Build Guide

## Prerequisites

1. **EAS CLI installed**
   ```powershell
   npm install -g eas-cli
   ```

2. **Expo account** (create at https://expo.dev if you don't have one)

3. **Git installed** (for EAS authentication)

## Step 1: Initialize EAS Build

Run this command in your project root:
```powershell
eas build:configure
```

This will:
- Create Android signing credentials (keystore)
- Set up your EAS project
- Generate credentials for APK/AAB signing

## Step 2: Build APK (Installable)

### Option A: Build APK for Testing (Quick)
```powershell
eas build --platform android --local
```

### Option B: Build APK via Cloud (Recommended)
```powershell
eas build --platform android --type apk
```

This creates a production-signed APK that users can install via:
- Email download link
- ADB (`adb install factify.apk`)
- Play Store upload

## Step 3: Build AAB (For Play Store)

For Google Play Store distribution:
```powershell
eas build --platform android --type aab
```

## Step 4: Download & Test

1. After build completes, EAS will provide a download link
2. Download the APK to your device
3. Enable "Unknown Sources" in Settings > Security
4. Open the APK file to install
5. Grant necessary permissions (when prompted)

## Step 5: Test Default Browser Functionality

After installation:
1. Open the app
2. Open a link in another app (SMS, WhatsApp, etc.)
3. Select "Factify" when asked to choose a browser
4. The app will verify the link and show results

## Current Build Configuration

**eas.json profiles:**
- `development` - Debug build with Expo dev client
- `preview` - Internal testing APK
- `production` - AAB for Play Store
- `android-apk` - Production APK

## Commands Reference

```powershell
# Login to Expo
eas login

# View build status
eas build:list

# Cancel an ongoing build
eas build:cancel <BUILD_ID>

# Configure credentials
eas credentials

# Local build (requires Android SDK)
eas build --platform android --local
```

## Important Notes

✅ **Intent filters configured** - The app can now:
- Receive http:// and https:// links
- Be set as default browser
- Verify links before opening

✅ **Signing configured** - APK will be automatically signed by EAS

✅ **Package name** - `com.factify.app`

⚠️ **Server Requirements** - Ensure OpenAI API key is set in `server/.env`

## Troubleshooting

**Build fails with credentials error:**
```powershell
eas credentials
```

**APK won't install:**
- Ensure you're using Android 8.0+ (API 26)
- Check "Unknown Sources" is enabled
- Clear app data if reinstalling

**Links not opening in app:**
- Go to Settings > Apps > Factify > Set as Default > Browser
- Or long-press a link and select Factify
