import React, { useEffect, useState } from 'react';
import { View, Linking, Alert } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { ImagePreviewScreen } from '@/components/scanner/ImagePreviewScreen';
import { ScanResultScreen } from '@/components/scanner/ScanResultScreen';
import { CameraViewScreen } from '@/components/scanner/CameraViewScreen';
import * as ScannerContextModule from '@/context/ScannerContext';
const { useScanner, ScannerProvider } = ScannerContextModule;
import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { useColorScheme } from '@/lib/useColorScheme';
import { Icon } from '@/components/nativewindui/Icon';

function ScannerContent() {
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [permission, setPermission] = useState<{ granted: boolean } | null>(
    null,
  );

  useEffect(() => {
    setPermission(hasPermission ? { granted: true } : { granted: false });
  }, [hasPermission]);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result) {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to scan QR codes. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  };
  const {
    state: {
      flashEnabled,
      isScanning,
      scannedData,
      isConnecting,
      isReloading,
      isUsingNativeVpn,
      selectedImageUri,
      screenMode,
    },
    setFlashEnabled,
    handlePickImage,
    handleConnectFromImage,
    handleBarCodeScanned,
    handleConnect,
    handleReload,
    handleRescan,
  } = useScanner();
  const { colors } = useColorScheme();

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={[]}>
        <View
          className="flex-1 items-center justify-center"
          style={{ paddingTop: insets.top }}
        >
          <Text variant="body" color="secondary">
            Loading camera...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={[]}>
        <View
          className="flex-1 items-center justify-center"
          style={{ paddingTop: insets.top }}
        >
          <Icon
            name="camera.fill"
            size={64}
            color={colors.grey}
            className="mb-4"
          />
          <Text variant="title3" className="mb-2 text-center font-semibold">
            Camera Permission Required
          </Text>
          <Text variant="body" color="secondary" className="mb-6 text-center">
            This app needs access to your camera to scan WireGuard QR codes.
          </Text>
          <Button
            onPress={handleRequestPermission}
            variant="primary"
            className="bg-blue-600"
          >
            <Text className="text-white">Grant Permission</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Main UI using components
  return (
    <SafeAreaView className="flex-1 bg-background" edges={[]}>
      <View className="flex-1">
        {screenMode === 'imagePreview' && selectedImageUri ? (
          <ImagePreviewScreen
            selectedImageUri={selectedImageUri}
            isConnecting={isConnecting}
            onConnect={handleConnectFromImage}
            onBack={handleRescan}
          />
        ) : screenMode === 'result' && scannedData ? (
          <ScanResultScreen
            scannedData={scannedData}
            isConnecting={isConnecting}
            isReloading={isReloading}
            isUsingNativeVpn={isUsingNativeVpn}
            onConnect={handleConnect}
            onReload={handleReload}
            onRescan={handleRescan}
          />
        ) : (
          <>
            <CameraViewScreen
              flashEnabled={flashEnabled}
              isScanning={isScanning}
              onBarcodeScanned={handleBarCodeScanned}
              onToggleFlash={() => setFlashEnabled(!flashEnabled)}
              onPickImage={handlePickImage}
              onClose={handleRescan}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function ScannerScreen() {
  return (
    <ScannerProvider>
      <ScannerContent />
    </ScannerProvider>
  );
}
