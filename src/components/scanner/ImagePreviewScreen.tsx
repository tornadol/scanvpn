import { View, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { Icon } from '@/components/nativewindui/Icon';
import { Button } from '@/components/nativewindui/Button';
import { BRAND_COLORS } from '@/constants/colors';

interface ImagePreviewScreenProps {
  selectedImageUri: string;
  isConnecting: boolean;
  onConnect: () => void;
  onBack: () => void;
}

export function ImagePreviewScreen({
  selectedImageUri,
  isConnecting,
  onConnect,
  onBack,
}: ImagePreviewScreenProps) {
  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View className="flex-row items-center justify-between px-6 py-4">
          <Pressable
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/10">
            <Icon name="xmark" size={20} color="white" />
          </Pressable>

          <Text className="text-lg font-semibold text-black dark:text-white">Selected Image</Text>

          <View className="h-10 w-10" />
        </View>
      </SafeAreaView>

      <View className="flex-1 p-6">
        {/* Image Display */}
        <View className="mb-6 flex-1 items-center justify-center rounded-2xl bg-gray-100 p-4 dark:bg-gray-800">
          <Image
            source={{ uri: selectedImageUri }}
            className="h-64 w-64 rounded-lg"
            resizeMode="contain"
          />
        </View>

        {/* Instructions */}
        <View className="mb-6 rounded-2xl bg-blue-50 p-4 dark:bg-blue-900/20">
          <View className="mb-2 flex-row items-center gap-2">
            <Icon name="info.circle" size={20} color={BRAND_COLORS.primary} />
            <Text className="text-sm font-medium text-blue-900 dark:text-blue-100">
              QR Code Detection
            </Text>
          </View>
          <Text className="text-sm text-blue-800 dark:text-blue-200">
            This image will be scanned for a WireGuard QR code. Make sure the QR code is clearly
            visible.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="mt-auto space-y-3">
          {/* Connect Button */}
          <Button
            onPress={onConnect}
            disabled={isConnecting}
            style={{
              backgroundColor: BRAND_COLORS.primary,
              minHeight: 56,
            }}
            className="rounded-xl">
            <Text className="text-lg font-semibold text-black">
              {isConnecting ? 'Scanning...' : 'Connect'}
            </Text>
          </Button>

          {/* Choose Different Image */}
          <Button variant="plain" onPress={onBack} disabled={isConnecting} className="rounded-xl">
            <Text className="text-base">Choose Different Image</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
