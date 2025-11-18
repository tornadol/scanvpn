import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { Icon } from '@/components/nativewindui/Icon';
import { Button } from '@/components/nativewindui/Button';
import { BRAND_COLORS } from '@/constants/colors';
import { ScannedConfig } from '@/lib/types/wireguard';

interface ScanResultScreenProps {
  scannedData: ScannedConfig;
  isConnecting: boolean;
  isReloading: boolean;
  isUsingNativeVpn: boolean;
  onConnect: () => void;
  onReload: () => void;
  onRescan: () => void;
}

export function ScanResultScreen({
  scannedData,
  isConnecting,
  isReloading,
  isUsingNativeVpn,
  onConnect,
  onReload,
  onRescan,
}: ScanResultScreenProps) {
  const facilityName = (() => {
    const endpointHost = scannedData?.parsed?.peer.endpoint.split(':')[0] || '';
    return endpointHost.replace(/\.|_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  })();

  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View className="flex-row items-center justify-between px-6 py-4">
          <Pressable
            onPress={onRescan}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/10">
            <Icon name="xmark" size={20} color="white" />
          </Pressable>

          <Text className="text-lg font-semibold text-black dark:text-white">Scan QR Code</Text>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => console.log('Scan history pressed')}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/10">
              <Icon name="clock" size={22} color="white" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <View className="flex-1 p-6">
        {/* Success Message */}
        <View className="mb-6 flex-row items-center justify-center gap-2">
          <View
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: BRAND_COLORS.success }}>
            <Icon name="checkmark" size={18} color="white" />
          </View>
          <Text className="text-lg font-semibold">Code scan successful!</Text>
        </View>

        {/* QR Code Display */}
        <View className="mb-6 rounded-3xl p-8" style={{ backgroundColor: BRAND_COLORS.primaryBg }}>
          <View className="items-center rounded-2xl bg-white p-6">
            <Icon name="qrcode" size={160} color="black" />
          </View>
        </View>

        {/* Facility and Payment Information */}
        {scannedData?.parsed && (
          <View className="mb-6 gap-4">
            {/* Facility Name */}
            <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <Text variant="footnote" color="secondary" className="mb-1">
                Facility
              </Text>
              <Text variant="title3" className="font-semibold">
                {facilityName}
              </Text>
            </View>

            {/* Payment Amount */}
            <View className="rounded-2xl bg-gradient-to-r from-pink-500 to-pink-600 p-4">
              <Text className="mb-1 text-sm font-medium text-white opacity-90">Access Fee</Text>
              <Text className="text-2xl font-bold text-white">$5.00</Text>
              <Text className="mt-1 text-sm text-white opacity-90">Per hour</Text>
            </View>

            {/* Configuration Details */}
            <View className="gap-3">
              <View>
                <Text variant="footnote" color="secondary" className="mb-1">
                  Server
                </Text>
                <Text variant="body" className="font-medium">
                  {scannedData?.parsed?.peer.endpoint || ''}
                </Text>
              </View>

              <View>
                <Text variant="footnote" color="secondary" className="mb-1">
                  Your IP
                </Text>
                <Text variant="body" className="font-medium">
                  {scannedData?.parsed?.interface.address.join(', ') || ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="mt-auto space-y-3">
          {/* Pay Now Button */}
          <Button
            onPress={onConnect}
            disabled={isConnecting || isReloading}
            style={{
              backgroundColor: BRAND_COLORS.primary,
              minHeight: 56,
            }}
            className="rounded-xl">
            <Text className="text-lg font-semibold text-black">
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Text>
          </Button>

          {/* Reload Connection Button */}
          <Button
            onPress={onReload}
            disabled={isConnecting || isReloading}
            style={{
              backgroundColor: BRAND_COLORS.primaryBg,
              minHeight: 56,
            }}
            className="rounded-xl">
            <Text className="text-base font-semibold text-black">
              {isReloading ? 'Reloading...' : '🔄 Reload Connection'}
            </Text>
          </Button>

          {/* Scan Again */}
          <Button
            variant="plain"
            onPress={onRescan}
            disabled={isConnecting || isReloading}
            className="rounded-xl">
            <Text className="text-base">Scan Another Code</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
