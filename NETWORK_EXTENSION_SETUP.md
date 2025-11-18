# Network Extension Setup Guide

## Problem
iOS shows "ScanVPN must be updated" because the app needs a Network Extension target to run VPN tunnels.

## Solution: Create Network Extension Target

### Step 1: Open Xcode Project
```bash
cd ios
open ScanVPN.xcworkspace
```

### Step 2: Create Network Extension Target

1. In Xcode, go to **File** → **New** → **Target**
2. Select **Network Extension** → **Packet Tunnel Provider**
3. Click **Next**
4. Configure:
   - **Product Name**: `ScanVPNTunnel`
   - **Bundle Identifier**: `com.watawaste.ScanVPN.tunnel` (MUST match exactly)
   - **Language**: Objective-C or Swift
5. Click **Finish**
6. When prompted, click **Activate** to add the scheme

### Step 3: Configure the Extension

1. Select the **ScanVPNTunnel** target
2. Go to **Signing & Capabilities**
3. Ensure:
   - Team is selected
   - Bundle Identifier is: `com.watawaste.ScanVPN.tunnel`
4. Go to **Build Settings**
5. Set **iOS Deployment Target** to match main app (16.0)

### Step 4: Add Entitlements

1. Create entitlements file: `ScanVPNTunnel.entitlements`
2. Add:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.networking.networkextension</key>
    <array>
        <string>packet-tunnel-provider</string>
    </array>
</dict>
</plist>
```

### Step 5: Implement Basic Tunnel Provider

The extension needs a basic implementation. You can use a minimal WireGuard tunnel provider.

### Step 6: Rebuild and Install

```bash
cd ios
pod install
cd ..
npx react-native run-ios --device
```

## Important Notes

- The bundle ID **MUST** be exactly: `com.watawaste.ScanVPN.tunnel`
- The extension must be signed with the same team as the main app
- You may need to add the extension to your Apple Developer account
- The extension will appear as a separate app in Settings → VPN

## Alternative: Use a Different VPN Module

If setting up the Network Extension is too complex, consider using a VPN module that handles this automatically or doesn't require a custom extension.

