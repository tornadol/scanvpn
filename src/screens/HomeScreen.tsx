import React, { useState, useEffect } from 'react';
import { ConnectionInfo } from '@/lib/types/wireguard';
import { View, ScrollView, Linking, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Icon } from '@/components/nativewindui/Icon';
import { Button } from '@/components/nativewindui/Button';
import {
  getStatus,
  disconnect,
  getConnectionInfo,
} from '@/lib/wireguard/connection';
import { ConnectionStatus } from '@/lib/types/wireguard';
import { getActiveProfile } from '@/lib/wireguard/storage';
import { BRAND_COLORS } from '@/constants/colors';

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const [status, info, profile] = await Promise.all([
          getStatus(),
          getConnectionInfo(),
          getActiveProfile(),
        ]);

        // Validate connection status - only show connected if we have real evidence
        let validatedStatus = status;

        // If status says connected but we don't have connection info or active profile,
        // it might be a false positive - verify it's actually connected
        if (status === 'connected') {
          // Require both connection info and active profile to show as connected
          if (!info || !profile) {
            console.warn(
              '⚠️ Status shows connected but missing info/profile - verifying...',
            );
            // Double-check the status
            const recheckStatus = await getStatus();
            if (recheckStatus !== 'connected' || !info || !profile) {
              console.log(
                '❌ False positive connection detected - marking as disconnected',
              );
              validatedStatus = 'disconnected';
              setConnectionInfo(null);
              setActiveProfile(null);
            }
          } else {
            // Verify the profile has valid config
            if (
              !profile.config ||
              !profile.config.interface ||
              !profile.config.peer
            ) {
              console.warn(
                '⚠️ Active profile missing valid config - marking as disconnected',
              );
              validatedStatus = 'disconnected';
              setConnectionInfo(null);
              setActiveProfile(null);
            }
          }
        }

        setConnectionStatus(validatedStatus);
        setConnectionInfo(info);
        setActiveProfile(profile);
      } catch (error) {
        console.error('Error checking connection status:', error);
        // On error, assume disconnected
        setConnectionStatus('disconnected');
        setConnectionInfo(null);
        setActiveProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkConnectionStatus();

    // Check status every 2 seconds
    const interval = setInterval(checkConnectionStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusDisplay = () => {
    if (loading)
      return { text: 'Checking...', color: '#9CA3AF', icon: 'clock' as const };

    switch (connectionStatus) {
      case 'connected':
        return {
          text: 'Connected',
          color: BRAND_COLORS.success,
          icon: 'checkmark.circle' as const,
        };
      case 'connecting':
        return {
          text: 'Connecting...',
          color: BRAND_COLORS.primary,
          icon: 'clock' as const,
        };
      case 'disconnecting':
        return {
          text: 'Disconnecting...',
          color: '#F59E0B',
          icon: 'clock' as const,
        };
      case 'error':
        return {
          text: 'Connection Error',
          color: '#EF4444',
          icon: 'xmark.circle' as const,
        };
      default:
        return {
          text: 'Not Connected',
          color: '#9CA3AF',
          icon: 'xmark.circle' as const,
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  const handleDisconnect = async () => {
    try {
      await disconnect();
      const status = await getStatus();
      setConnectionStatus(status);

      if (status === 'disconnected') {
        setActiveProfile(null);
        setConnectionInfo(null);
      }
    } catch (error) {
      console.error('Error disconnecting VPN:', error);
    }
  };

  const openVPNSettings = async () => {
    if (Platform.OS === 'ios') {
      // Try to open VPN settings directly
      const vpnSettingsUrl = 'App-Prefs:root=General&path=VPN';
      const canOpen = await Linking.canOpenURL(vpnSettingsUrl);

      if (canOpen) {
        try {
          await Linking.openURL(vpnSettingsUrl);
        } catch (error) {
          // Fallback to general settings
          await Linking.openSettings();
        }
      } else {
        // Fallback to general settings
        await Linking.openSettings();
      }
    } else {
      await Linking.openSettings();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={[]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pb-6" style={{ paddingTop: insets.top + 8 }}>
          <Text className="text-[28px] font-bold text-black mb-4">
            WireGuard Status
          </Text>
          {/* Connection Status Card */}
          <View
            className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
            style={{ borderLeftWidth: 4, borderLeftColor: statusDisplay.color }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-800">
                VPN Status
              </Text>
              <View className="flex-row items-center">
                <Icon
                  name={statusDisplay.icon}
                  size={20}
                  color={statusDisplay.color}
                />
                <Text
                  className="text-base font-medium ml-2"
                  style={{ color: statusDisplay.color }}
                >
                  {statusDisplay.text}
                </Text>
              </View>
            </View>

            {/* Connection Details - Only show if we have valid connection info */}
            {connectionStatus === 'connected' &&
              activeProfile &&
              connectionInfo &&
              activeProfile.config &&
              activeProfile.config.interface &&
              activeProfile.config.peer && (
                <View>
                  <View className="h-px bg-gray-200 my-3" />

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-xs text-gray-500">Profile</Text>
                    <Text className="text-xs font-medium text-gray-800">
                      {activeProfile.name || 'Unnamed Profile'}
                    </Text>
                  </View>

                  {connectionInfo.endpoint && (
                    <View className="flex-row justify-between mb-3">
                      <Text className="text-xs text-gray-500">Server</Text>
                      <Text className="text-xs font-medium text-gray-800">
                        {connectionInfo.endpoint}
                      </Text>
                    </View>
                  )}

                  {connectionInfo.virtualIP && (
                    <View className="flex-row justify-between mb-3">
                      <Text className="text-xs text-gray-500">Virtual IP</Text>
                      <Text className="text-xs font-medium text-gray-800">
                        {connectionInfo.virtualIP}
                      </Text>
                    </View>
                  )}

                  {connectionInfo.connectedAt && (
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray-500">Connected</Text>
                      <Text className="text-xs font-medium text-gray-800">
                        {new Date(
                          connectionInfo.connectedAt,
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              )}
          </View>

          {/* VPN Permission Help - Show when disconnected or error */}
          {(connectionStatus === 'disconnected' ||
            connectionStatus === 'error') &&
            Platform.OS === 'ios' && (
              <View className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <View className="mb-2 flex-row items-center">
                  <Icon name="info.circle" size={18} color="#F59E0B" />
                  <Text className="ml-2 text-sm font-semibold text-yellow-800">
                    VPN Permission Required
                  </Text>
                </View>
                <Text className="mb-3 text-xs text-yellow-700">
                  To connect to VPN, you need to enable VPN access in iOS
                  Settings. Go to Settings → General → VPN & Device Management →
                  VPN and enable ScanVPN.
                </Text>
                <Button
                  onPress={openVPNSettings}
                  className="rounded-lg bg-yellow-500 min-h-[40px]"
                >
                  <Text className="text-sm font-semibold text-white">
                    Open VPN Settings
                  </Text>
                </Button>
              </View>
            )}

          {/* Disconnect Button - Only show when connected with valid config */}
          {connectionStatus === 'connected' &&
            activeProfile &&
            connectionInfo &&
            activeProfile.config &&
            activeProfile.config.interface &&
            activeProfile.config.peer && (
              <View className="mt-6">
                <Button
                  onPress={handleDisconnect}
                  className="rounded-xl bg-red-500 min-h-[56px]"
                >
                  <Text className="text-lg font-semibold text-white">
                    Disconnect VPN
                  </Text>
                </Button>
              </View>
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
