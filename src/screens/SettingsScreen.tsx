import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { Input } from '@/components/nativewindui/Input';
import { BRAND_COLORS } from '@/constants/colors';
import {
  useSettings,
  SettingsProvider,
  type VPNConfigForm,
} from '@/context/SettingsContext';

function SettingsContent() {
  const insets = useSafeAreaInsets();
  // Get context first - this will throw if there's an error
  const {
    state: { isConnecting, isConnected, form, errors },
    setFormField,
    resetForm,
    handleSubmit,
    // handleDisconnect,
    // checkConnectionStatus,
  } = useSettings();

  console.log('Settings page loaded successfully');

  // Check connection status on mount
  // useEffect(() => {
  //   checkConnectionStatus();
  // }, []);

  const updateForm = (field: keyof VPNConfigForm, value: string) => {
    setFormField(field, value);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[]}>
      <View
        className="flex-1 items-center justify-center px-6 pb-6"
        style={{ paddingTop: insets.top + 8 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="pb-6">
            {/* Header */}
            <View className="mb-6">
              <Text className="text-[28px] font-bold text-black mb-4">
                Manual VPN Configuration
              </Text>
              <Text className="mt-2 text-center text-primary">
                Configure WireGuard VPN manually without scanning QR codes
              </Text>
            </View>
            {/* Configuration Form */}
            <View className="space-y-4">
              {/* Profile Name */}
              <View>
                <Text className="mb-2 font-medium text-foreground">
                  Profile Name
                </Text>
                <Input
                  value={form.name}
                  onChangeText={value => updateForm('name', value)}
                  placeholder="My VPN Configuration"
                  editable={!isConnecting}
                  error={errors.name}
                />
              </View>

              {/* Interface Section */}
              <View className="mt-4">
                <Text className="mb-3 text-lg font-semibold text-foreground">
                  Interface
                </Text>

                <View className="space-y-3">
                  <View>
                    <Text className="mb-2 font-medium text-foreground">
                      Private Key
                    </Text>
                    <Input
                      value={form.privateKey}
                      onChangeText={value => updateForm('privateKey', value)}
                      placeholder="Enter WireGuard private key"
                      editable={!isConnecting}
                      multiline
                      numberOfLines={2}
                      error={errors.privateKey}
                    />
                  </View>

                  <View>
                    <Text className="mb-2 font-medium text-foreground">
                      IP Address
                    </Text>
                    <Input
                      value={form.address}
                      onChangeText={value => updateForm('address', value)}
                      placeholder="10.0.0.2/24"
                      editable={!isConnecting}
                      error={errors.address}
                    />
                  </View>

                  <View>
                    <Text className="mb-2 font-medium text-foreground">
                      DNS Servers
                    </Text>
                    <Input
                      value={form.dns}
                      onChangeText={value => updateForm('dns', value)}
                      placeholder="8.8.8.8, 1.1.1.1"
                      editable={!isConnecting}
                      error={errors.dns}
                    />
                  </View>
                </View>
              </View>

              {/* Peer Section */}
              <View className="mt-4">
                <Text className="mb-3 text-lg font-semibold text-foreground">
                  Peer
                </Text>

                <View className="space-y-3">
                  <View>
                    <Text className="mb-2 font-medium text-foreground">
                      Public Key
                    </Text>
                    <Input
                      value={form.publicKey}
                      onChangeText={value => updateForm('publicKey', value)}
                      placeholder="Enter WireGuard public key"
                      editable={!isConnecting}
                      multiline
                      numberOfLines={2}
                      error={errors.publicKey}
                    />
                  </View>

                  <View>
                    <Text className="mb-2 font-medium text-foreground">
                      Endpoint
                    </Text>
                    <Input
                      value={form.endpoint}
                      onChangeText={value => updateForm('endpoint', value)}
                      placeholder="vpn.example.com:51820"
                      editable={!isConnecting}
                      error={errors.endpoint}
                    />
                  </View>

                  <View>
                    <Text className="mb-2 font-medium text-foreground">
                      Allowed IPs
                    </Text>
                    <Input
                      value={form.allowedIPs}
                      onChangeText={value => updateForm('allowedIPs', value)}
                      placeholder="0.0.0.0/0"
                      editable={!isConnecting}
                      error={errors.allowedIPs}
                    />
                  </View>

                  <View>
                    <Text className="mb-2 font-medium text-foreground">
                      Persistent Keepalive
                    </Text>
                    <Input
                      value={form.persistentKeepalive}
                      onChangeText={value =>
                        updateForm('persistentKeepalive', value)
                      }
                      placeholder="25 (seconds)"
                      editable={!isConnecting}
                      keyboardType="numeric"
                      error={errors.persistentKeepalive}
                    />
                  </View>

                  <View>
                    <Text className="mb-2 font-medium text-foreground">
                      Pre-shared Key (Optional)
                    </Text>
                    <Input
                      value={form.presharedKey}
                      onChangeText={value => updateForm('presharedKey', value)}
                      placeholder="Optional pre-shared key"
                      editable={!isConnecting}
                      multiline
                      numberOfLines={2}
                      error={errors.presharedKey}
                    />
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="mt-8 space-y-3">
                <Button
                  onPress={handleSubmit}
                  disabled={isConnecting || isConnected}
                  className="rounded-xl"
                  style={{
                    backgroundColor: BRAND_COLORS.primary,
                    minHeight: 56,
                  }}
                >
                  <Text className="text-lg font-semibold text-white">
                    {isConnecting ? 'Connecting...' : 'Connect to VPN'}
                  </Text>
                </Button>

                <View className="flex-row gap-3">
                  <Button
                    variant="plain"
                    onPress={resetForm}
                    disabled={isConnecting}
                    className="flex-1 rounded-xl"
                  >
                    <Text>Clear Form</Text>
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export default function SettingsScreen() {
  return (
    <SettingsProvider>
      <SettingsContent />
    </SettingsProvider>
  );
}
