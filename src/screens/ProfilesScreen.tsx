import React from 'react';
import { View, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Icon } from '@/components/nativewindui/Icon';
import { Button } from '@/components/nativewindui/Button';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { VPNProfile } from '@/lib/types/wireguard';
import { BRAND_COLORS } from '@/constants/colors';
import { useProfiles } from '@/context/ProfilesContext';
import { formatDate } from '@/helpers/datetimeHelpers';
import type { TabNavigationProp } from '@/navigation/types';

function ProfilesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TabNavigationProp>();
  const {
    state: { profiles, refreshing },
    deleteProfile,
    refreshProfiles,
  } = useProfiles();

  const handleStartScanning = () => {
    navigation.navigate('Scanner');
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshProfiles();
    }, []),
  );

  const renderProfileItem = ({ item }: { item: VPNProfile }) => (
    <View className="rounded-2xl bg-white p-4 mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text variant="title3" className="font-semibold">
              {item.name}
            </Text>
            {item.isActive && (
              <View
                className="rounded-full px-2 py-1"
                style={{ backgroundColor: BRAND_COLORS.success + '20' }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: BRAND_COLORS.success }}
                >
                  Active
                </Text>
              </View>
            )}
          </View>

          <Text variant="footnote" color="secondary" className="mb-2">
            Server: {item.config.peer.endpoint}
          </Text>

          <Text variant="footnote" color="secondary" className="mb-1">
            IP: {item.config.interface.address.join(', ')}
          </Text>

          <View className="flex-row items-center gap-4">
            <Text variant="caption2" color="tertiary">
              Created: {formatDate(item.createdAt)}
            </Text>
            {item.lastUsed && (
              <Text variant="caption2" color="tertiary">
                Used: {formatDate(item.lastUsed)}
              </Text>
            )}
          </View>
        </View>

        <Pressable
          onPress={() => deleteProfile(item)}
          className="ml-4 h-10 w-10 items-center justify-center rounded-full bg-red-50 active:bg-red-100"
        >
          <Icon name="trash" size={18} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[]}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pb-2" style={{ paddingTop: insets.top + 8 }}>
          <Text className="text-[28px] font-bold text-black">VPN Profiles</Text>
          <Text variant="body" color="primary">
            {profiles.length > 0
              ? `You have ${profiles.length} saved profile${
                  profiles.length !== 1 ? 's' : ''
                }`
              : 'No saved VPN profiles'}
          </Text>
        </View>

        {/* Profile List */}
        <View className="flex-1 px-6">
          {profiles.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Icon name="folder" size={64} color="#9CA3AF" className="" />
              <Text
                variant="title3"
                className="mb-2 text-center font-semibold text-gray-500"
              >
                No Profiles Yet
              </Text>
              <Text
                variant="body"
                color="secondary"
                className="mb-6 text-center"
              >
                Scan a QR code to save your first VPN profile
              </Text>
              <Button
                onPress={handleStartScanning}
                style={{ backgroundColor: BRAND_COLORS.primary }}
                className="rounded-xl px-6"
              >
                <Text className="font-semibold text-white">Start Scanning</Text>
              </Button>
            </View>
          ) : (
            <FlatList
              data={profiles}
              keyExtractor={item => item.id}
              renderItem={renderProfileItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshProfiles}
                  tintColor={BRAND_COLORS.primary}
                />
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default ProfilesScreen;
