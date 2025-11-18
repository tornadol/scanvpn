import { View, Pressable, StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { Icon } from '@/components/nativewindui/Icon';
import { BRAND_COLORS } from '@/constants/colors';

interface CameraViewScreenProps {
  flashEnabled: boolean;
  isScanning: boolean;
  onBarcodeScanned: (result: { data: string }) => void;
  onToggleFlash: () => void;
  onPickImage: () => void;
  onClose: () => void;
}

export function CameraViewScreen({
  flashEnabled,
  isScanning,
  onBarcodeScanned,
  onToggleFlash,
  onPickImage,
  onClose,
}: CameraViewScreenProps) {
  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (isScanning && codes.length > 0) {
        onBarcodeScanned({ data: codes[0].value || '' });
      }
    },
  });

  if (!device) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Camera not available</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={isScanning}
        torch={flashEnabled ? 'on' : 'off'}
        codeScanner={codeScanner}
      >
        {/* Viewfinder Overlay */}
        <View className="absolute inset-0 flex-1 items-center justify-center">
          {/* Scanning area */}
          <View className="h-72 w-72">
            {/* Corner brackets */}
            <View
              className="absolute left-0 top-0 h-12 w-12 border-l-4 border-t-4"
              style={{ borderColor: BRAND_COLORS.primary }}
            />
            <View
              className="absolute right-0 top-0 h-12 w-12 border-r-4 border-t-4"
              style={{ borderColor: BRAND_COLORS.primary }}
            />
            <View
              className="absolute bottom-0 left-0 h-12 w-12 border-b-4 border-l-4"
              style={{ borderColor: BRAND_COLORS.primary }}
            />
            <View
              className="absolute bottom-0 right-0 h-12 w-12 border-b-4 border-r-4"
              style={{ borderColor: BRAND_COLORS.primary }}
            />
          </View>
        </View>
      </Camera>

      {/* Header - positioned above camera */}
      <SafeAreaView
        edges={['top']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <View className="flex-row items-center justify-between px-6 py-4">
          <Pressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
          >
            <Icon name="xmark" size={20} color="white" />
          </Pressable>

          <Text className="text-lg font-semibold text-white">Scan QR Code</Text>

          <View className="flex-row gap-3">
            <Pressable
              onPress={onPickImage}
              style={{
                minWidth: 44,
                minHeight: 44,
              }}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
            >
              <Icon name="photo" size={22} color="white" />
            </Pressable>
            <Pressable
              onPress={onToggleFlash}
              style={{
                minWidth: 44,
                minHeight: 44,
              }}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
            >
              <Icon
                name={flashEnabled ? 'bolt.fill' : 'bolt'}
                size={22}
                color={flashEnabled ? BRAND_COLORS.primary : 'white'}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Instructions and Bottom Navigation */}
      <SafeAreaView
        edges={['bottom']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <View className="items-center px-6 pb-20">
          <Text className="mb-4 text-center text-white">
            Place the QR code properly inside the area.{'\n'}
            Scanning will start automatically
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
