# Capacitor Mobile App Setup

This guide explains how to build and deploy native iOS and Android apps from your HR platform.

## Prerequisites

### For iOS Development:
- macOS computer
- Xcode 14+ installed
- Apple Developer Account ($99/year)
- CocoaPods installed (`sudo gem install cocoapods`)

### For Android Development:
- Android Studio installed
- Java JDK 17+ installed
- Android SDK configured

## Setup Steps

### 1. Build the Web App

```bash
pnpm run build
```

This creates the production build in `dist/public/`.

### 2. Add iOS Platform

```bash
npx cap add ios
```

This creates an `ios/` directory with the Xcode project.

### 3. Add Android Platform

```bash
npx cap add android
```

This creates an `android/` directory with the Android Studio project.

### 4. Sync Assets

After any web app changes, sync them to native projects:

```bash
pnpm run build
npx cap sync
```

## Opening Native Projects

### iOS:
```bash
npx cap open ios
```

This opens the project in Xcode. Press the "Play" button to run on simulator or device.

### Android:
```bash
npx cap open android
```

This opens the project in Android Studio. Click "Run" to launch on emulator or device.

## Camera Plugin Usage

The `@capacitor/camera` plugin is installed for document scanning:

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri
  });
  
  // image.webPath contains the image URI
  const imageUrl = image.webPath;
};
```

## Push Notifications

The `@capacitor/push-notifications` plugin is installed:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

// Request permission
await PushNotifications.requestPermissions();

// Register for push
await PushNotifications.register();

// Listen for registration
PushNotifications.addListener('registration', (token) => {
  console.log('Push registration success, token: ' + token.value);
});
```

## App Icons and Splash Screens

1. Generate icons at https://icon.kitchen or https://appicon.co
2. Place generated assets in:
   - iOS: `ios/App/App/Assets.xcassets/`
   - Android: `android/app/src/main/res/`

## Publishing

### iOS App Store:
1. Open project in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Distribute App → App Store Connect
5. Upload and submit for review in App Store Connect

### Google Play Store:
1. Open project in Android Studio
2. Build → Generate Signed Bundle / APK
3. Follow wizard to create signing key
4. Upload AAB to Google Play Console
5. Complete store listing and submit for review

## Troubleshooting

### iOS Build Errors:
- Run `pod install` in `ios/App/` directory
- Clean build folder: Product → Clean Build Folder in Xcode

### Android Build Errors:
- Sync Gradle: File → Sync Project with Gradle Files
- Invalidate caches: File → Invalidate Caches / Restart

### Plugin Issues:
- Ensure `npx cap sync` was run after installing plugins
- Check that native permissions are added to Info.plist (iOS) and AndroidManifest.xml (Android)

## Native Permissions

### iOS (Info.plist):
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan documents</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to upload documents</string>
```

### Android (AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Deployment Guide](https://capacitorjs.com/docs/ios)
- [Android Deployment Guide](https://capacitorjs.com/docs/android)
- [Plugin API Reference](https://capacitorjs.com/docs/apis)
