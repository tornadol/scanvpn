import {
  WireGuardConfig,
  ConnectionStatus,
  ConnectionResult,
  ConnectionInfo,
} from '../types/wireguard';
import { setActiveProfileId, markProfileUsed } from './storage';
import { fixVPNConfig } from './configFixer';
import { ToastManager } from '@/components/nativewindui/Toast';

// Try to import WireGuard module
let WireGuardVpnModule: any = null;
let hasNativeModule = false;

try {
  // Import from the correct package name
  const wgModule = require('react-native-wireguard-vpn-connect');
  WireGuardVpnModule = wgModule.default || wgModule;

  // Verify the module has the required methods
  if (
    WireGuardVpnModule &&
    typeof WireGuardVpnModule.initialize === 'function'
  ) {
    hasNativeModule = true;
    console.log('WireGuard native module loaded successfully');
  } else {
    console.warn('WireGuard module loaded but missing required methods');
    hasNativeModule = false;
  }
} catch (error) {
  console.error('WireGuard native module not available:', error);
  hasNativeModule = false;
}

/**
 * Native VPN Connection Manager
 *
 * This implementation requires the native WireGuard module:
 * - iOS: NEVPNManager / Network Extension
 * - Android: VpnService API
 */

class ConnectionManager {
  private currentStatus: ConnectionStatus = 'disconnected';
  private connectionInfo: ConnectionInfo | null = null;
  private isInitialized = false;
  private hasNativeModule = hasNativeModule;

  /**
   * Initialize the VPN service
   */
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      if (this.hasNativeModule && WireGuardVpnModule) {
        try {
          console.log('Initializing WireGuard VPN service...');

          if (typeof WireGuardVpnModule.initialize !== 'function') {
            throw new Error('WireGuard module missing initialize method');
          }

          await WireGuardVpnModule.initialize();
          this.isInitialized = true;
          console.log('✅ WireGuard VPN service initialized successfully');
        } catch (error) {
          let errorMessage = 'Failed to initialize VPN service';
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          const isStaleConfigError =
            errorMessage.includes('stale') ||
            errorMessage.includes('configuration is stale');

          if (isStaleConfigError) {
            console.log(
              'ℹ️ VPN configuration is stale (will be refreshed on connection)',
            );

            this.isInitialized = true;
            return;
          }

          console.error('❌ Failed to initialize VPN service:', error);

          // Provide specific error message
          const isPermissionError =
            errorMessage.includes('permission') ||
            errorMessage.includes('Permission') ||
            errorMessage.includes('denied') ||
            errorMessage.includes('not authorized') ||
            errorMessage.includes('authorization') ||
            errorMessage.toLowerCase().includes('vpn configuration');

          if (isPermissionError) {
            const permissionMessage =
              'VPN permission required. Go to Settings > General > VPN & Device Management to enable VPN access for ScanVPN.';
            ToastManager.getInstance().showToast(permissionMessage, 'error');
            console.log(
              '📱 VPN Permission Error - User needs to enable VPN in iOS Settings',
            );
            // Don't throw here - allow the app to continue, but mark as needing permission
          } else if (
            errorMessage.includes('NetworkExtension') ||
            errorMessage.includes('NEVPNManager') ||
            errorMessage.includes('extension')
          ) {
            ToastManager.getInstance().showToast(
              'Network Extension not configured. Please rebuild the app with proper entitlements.',
              'error',
            );
          } else {
            // For other errors, show a more helpful message
            const friendlyMessage =
              errorMessage.includes('stale') ||
              errorMessage.includes('configuration is stale')
                ? 'VPN configuration needs to be refreshed. This will be done automatically when connecting.'
                : `Failed to initialize VPN: ${errorMessage}`;
            ToastManager.getInstance().showToast(friendlyMessage, 'error');
          }

          this.isInitialized = true;

          // Only mark as unavailable if it's a critical linking/module error
          if (
            errorMessage.includes('linked') ||
            errorMessage.includes('module') ||
            errorMessage.includes('LINKING_ERROR')
          ) {
            this.hasNativeModule = false;
            console.warn('Marking WireGuard module as unavailable');
          }
        }
      } else {
        this.isInitialized = true;
        console.warn(
          '⚠️ WireGuard VPN module not available - check if module is properly linked',
        );
      }
    }
  }

  /**
   * Check if WireGuard VPN is supported on this device
   */
  async isSupported(): Promise<boolean> {
    if (this.hasNativeModule && WireGuardVpnModule) {
      try {
        const supported = await WireGuardVpnModule.isSupported();
        console.log('Native VPN support check:', supported);
        return supported;
      } catch (error) {
        console.error('Error checking native VPN support:', error);
        ToastManager.getInstance().showToast(
          'VPN support check failed. Native WireGuard module is required.',
          'error',
        );
        return false;
      }
    } else {
      console.log('Native WireGuard module not available');
      return false;
    }
  }

  /**
   * Get current connection status
   * Note: VPN connections persist across app restarts, so we check actual status
   * even if the manager hasn't been initialized yet.
   * Validates that connection is real by checking for active profile and config.
   */
  async getStatus(): Promise<ConnectionStatus> {
    // Try to initialize in background if not already initialized (non-blocking)
    if (!this.isInitialized) {
      this.initialize().catch(err => {
        console.warn('Background initialization failed:', err);
      });
    }

    // Check actual VPN status from native module (VPN persists across app restarts)
    if (this.hasNativeModule && WireGuardVpnModule) {
      try {
        // Verify getStatus method exists
        if (typeof WireGuardVpnModule.getStatus !== 'function') {
          console.warn('WireGuard module missing getStatus method');
          return 'disconnected';
        }

        const wgStatus: any = await WireGuardVpnModule.getStatus();

        // Validate response
        if (!wgStatus || typeof wgStatus !== 'object') {
          console.warn('Invalid status response from native module:', wgStatus);
          return 'disconnected';
        }

        // Map and cache the status
        let mappedStatus = this.mapWireGuardStatus(wgStatus);

        // Validate connection - if status says connected, verify we have real config
        if (mappedStatus === 'connected') {
          try {
            // Import here to avoid circular dependency
            const { getActiveProfile } = await import('./storage');
            const activeProfile = await getActiveProfile();

            // If no active profile, it's not a real connection
            if (!activeProfile) {
              console.warn(
                '⚠️ Status shows connected but no active profile found - marking as disconnected',
              );
              mappedStatus = 'disconnected';
              this.currentStatus = 'disconnected';
              this.connectionInfo = null;
            } else if (
              !activeProfile.config ||
              !activeProfile.config.interface ||
              !activeProfile.config.peer
            ) {
              // Profile exists but config is invalid
              console.warn(
                '⚠️ Status shows connected but profile has invalid config - marking as disconnected',
              );
              mappedStatus = 'disconnected';
              this.currentStatus = 'disconnected';
              this.connectionInfo = null;
            } else {
              // Valid connection - verify we have connection info
              if (!this.connectionInfo) {
                // Try to reconstruct connection info
                const addresses = Array.isArray(
                  activeProfile.config.interface.address,
                )
                  ? activeProfile.config.interface.address
                  : [activeProfile.config.interface.address];

                this.connectionInfo = {
                  status: 'connected',
                  profileId: activeProfile.id,
                  connectedAt:
                    activeProfile.lastUsed || new Date().toISOString(),
                  endpoint: activeProfile.config.peer?.endpoint,
                  virtualIP: addresses[0],
                };
              }
            }
          } catch (profileError) {
            console.error('Error validating connection profile:', profileError);
            // If we can't validate, assume disconnected for safety
            mappedStatus = 'disconnected';
            this.currentStatus = 'disconnected';
            this.connectionInfo = null;
          }
        }

        this.currentStatus = mappedStatus;

        // If we got a valid status, mark as initialized (status check succeeded)
        if (!this.isInitialized) {
          this.isInitialized = true;
          console.log('✅ Connection manager initialized via status check');
        }

        console.log('VPN Status:', {
          raw: wgStatus,
          mapped: mappedStatus,
          isConnected: wgStatus.isConnected,
          tunnelState: wgStatus.tunnelState,
          wasInitialized: this.isInitialized,
          validated: mappedStatus === 'connected' ? 'yes' : 'no',
        });

        return mappedStatus;
      } catch (error) {
        // Handle specific error types
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check if it's a critical error or just a transient issue
        const isCriticalError =
          errorMessage.includes('not linked') ||
          errorMessage.includes('module not found') ||
          errorMessage.includes('LINKING_ERROR');

        if (isCriticalError) {
          console.error('Critical error getting VPN status:', error);
          this.hasNativeModule = false;
          this.currentStatus = 'disconnected';
          this.connectionInfo = null;
          return 'disconnected';
        }

        // For transient errors, validate cached status
        console.warn(
          'Error getting VPN status (validating cached):',
          errorMessage,
        );

        // Validate cached status if it says connected
        if (this.currentStatus === 'connected') {
          try {
            const { getActiveProfile } = await import('./storage');
            const activeProfile = await getActiveProfile();

            if (
              !activeProfile ||
              !activeProfile.config ||
              !activeProfile.config.interface ||
              !activeProfile.config.peer
            ) {
              console.warn(
                '⚠️ Cached connected status invalid - no valid profile/config',
              );
              this.currentStatus = 'disconnected';
              this.connectionInfo = null;
              return 'disconnected';
            }
          } catch (validationError) {
            console.error('Error validating cached status:', validationError);
            this.currentStatus = 'disconnected';
            this.connectionInfo = null;
            return 'disconnected';
          }
        }

        // Return validated cached status or disconnected
        return this.currentStatus || 'disconnected';
      }
    } else {
      // Module not available - return disconnected (can't validate without module)
      console.log('VPN status check: Native module not available');
      this.currentStatus = 'disconnected';
      this.connectionInfo = null;
      return 'disconnected';
    }
  }

  /**
   * Get detailed connection information
   * Reconstructs connection info from active profile if VPN is connected but info is missing
   * Only returns info if connection is validated and has real config
   */
  async getConnectionInfo(): Promise<ConnectionInfo | null> {
    // If we have cached connection info, validate it's still valid
    if (this.connectionInfo) {
      // Validate the cached info is still valid
      try {
        const { getActiveProfile } = await import('./storage');
        const activeProfile = await getActiveProfile();

        if (
          activeProfile &&
          activeProfile.config &&
          activeProfile.config.interface &&
          activeProfile.config.peer &&
          activeProfile.id === this.connectionInfo.profileId
        ) {
          return this.connectionInfo;
        } else {
          // Cached info is invalid, clear it
          console.warn('⚠️ Cached connection info is invalid - clearing');
          this.connectionInfo = null;
        }
      } catch (error) {
        console.error('Error validating cached connection info:', error);
        this.connectionInfo = null;
      }
    }

    // If no cached info, check if VPN is actually connected with valid config
    const currentStatus = await this.getStatus();
    if (currentStatus === 'connected') {
      try {
        // Import here to avoid circular dependency
        const { getActiveProfile } = await import('./storage');
        const activeProfile = await getActiveProfile();

        // Validate profile has valid config structure
        if (
          activeProfile &&
          activeProfile.config &&
          activeProfile.config.interface &&
          activeProfile.config.peer
        ) {
          // Handle address as array or single string
          const addresses = Array.isArray(
            activeProfile.config.interface.address,
          )
            ? activeProfile.config.interface.address
            : [activeProfile.config.interface.address];

          // Reconstruct connection info from active profile
          this.connectionInfo = {
            status: 'connected',
            profileId: activeProfile.id,
            // Use lastUsed as connectedAt if available, otherwise use current time
            connectedAt: activeProfile.lastUsed || new Date().toISOString(),
            endpoint: activeProfile.config.peer?.endpoint,
            virtualIP: addresses[0],
          };

          console.log(
            '✅ Reconstructed connection info from active profile:',
            this.connectionInfo,
          );
          return this.connectionInfo;
        } else {
          console.warn(
            '⚠️ VPN status is connected but profile/config is invalid',
          );
          // Clear connection info if profile is invalid
          this.connectionInfo = null;
          return null;
        }
      } catch (error) {
        console.error('Error reconstructing connection info:', error);
        this.connectionInfo = null;
        return null;
      }
    }

    // Not connected or invalid - clear connection info
    this.connectionInfo = null;
    return null;
  }

  /**
   * Connect to VPN with given configuration
   */
  async connect(
    config: WireGuardConfig,
    profileId: string,
  ): Promise<ConnectionResult> {
    // Prevent connecting if already connected or connecting
    if (
      this.currentStatus === 'connected' ||
      this.currentStatus === 'connecting'
    ) {
      return {
        success: false,
        status: this.currentStatus,
        error: 'Already connected or connecting',
      };
    }

    try {
      await this.initialize();

      const isSupported = await this.isSupported();
      if (!isSupported || !this.hasNativeModule || !WireGuardVpnModule) {
        ToastManager.getInstance().showToast(
          'WireGuard VPN is not supported on this device. Native VPN module is required.',
          'error',
        );
        throw new Error('WireGuard VPN is not supported on this device');
      }

      this.updateStatus('connecting');

      // Request VPN permission on iOS - this is critical for real devices
      if (typeof WireGuardVpnModule.requestVpnPermission === 'function') {
        try {
          console.log('📱 Requesting VPN permission...');
          await WireGuardVpnModule.requestVpnPermission();
          console.log('✅ VPN permission request completed');
        } catch (permissionError) {
          const errorMsg =
            permissionError instanceof Error
              ? permissionError.message
              : String(permissionError);
          console.warn('⚠️ VPN permission request failed:', errorMsg);

          // On iOS, VPN permissions must be enabled in Settings
          // Provide helpful guidance to the user
          if (
            errorMsg.includes('permission') ||
            errorMsg.includes('denied') ||
            errorMsg.includes('not authorized')
          ) {
            ToastManager.getInstance().showToast(
              'VPN permission required. Please go to Settings > General > VPN & Device Management to enable VPN access for ScanVPN.',
              'error',
            );
            throw new Error(
              'VPN permission denied. Please enable VPN access in iOS Settings.',
            );
          }
        }
      } else {
        console.warn(
          '⚠️ requestVpnPermission method not available in native module',
        );
      }

      // Validate config
      const validation = this.validateConnectionConfig(config);
      if (!validation.isValid) {
        throw new Error(
          `Invalid VPN configuration: ${validation.issues.join(', ')}`,
        );
      }

      const wgConfig = this.convertToWireGuardConfig(config);

      console.log('🔌 Attempting to connect to VPN...');
      try {
        await WireGuardVpnModule.connect(wgConfig);
        console.log('✅ VPN connect() call completed');
      } catch (connectError) {
        const errorMsg =
          connectError instanceof Error
            ? connectError.message
            : String(connectError);
        console.error('❌ VPN connect() failed:', errorMsg);

        // Check for permission-related errors
        if (
          errorMsg.includes('permission') ||
          errorMsg.includes('denied') ||
          errorMsg.includes('not authorized') ||
          errorMsg.includes('VPN configuration')
        ) {
          throw new Error(
            'VPN permission denied. Please enable VPN access in iOS Settings > General > VPN & Device Management.',
          );
        }

        // Re-throw other errors
        throw connectError;
      }

      // Wait a moment for connection to start
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      let status = await WireGuardVpnModule.getStatus();
      let mappedStatus = this.mapWireGuardStatus(status);

      let tunnelState = status.tunnelState?.toUpperCase() || '';
      let isConnected =
        status.isConnected || tunnelState === 'UP' || tunnelState === 'ACTIVE';

      console.log('📊 Initial connection status:', {
        isConnected,
        tunnelState,
        mappedStatus,
        rawStatus: status,
      });

      // Retry up to 8 times if connecting (give more time on real devices)
      let attempts = 0;
      const maxAttempts = 8;
      while (
        !isConnected &&
        (tunnelState === 'CONNECTING' || mappedStatus === 'connecting') &&
        attempts < maxAttempts
      ) {
        console.log(
          `⏳ Waiting for connection... (attempt ${
            attempts + 1
          }/${maxAttempts})`,
        );
        await new Promise<void>(resolve => setTimeout(resolve, 1500));
        status = await WireGuardVpnModule.getStatus();
        mappedStatus = this.mapWireGuardStatus(status);
        tunnelState = status.tunnelState?.toUpperCase() || '';
        isConnected =
          status.isConnected ||
          tunnelState === 'UP' ||
          tunnelState === 'ACTIVE';

        console.log(`📊 Status check ${attempts + 1}:`, {
          isConnected,
          tunnelState,
          mappedStatus,
        });

        if (
          tunnelState === 'INACTIVE' ||
          tunnelState === 'DOWN' ||
          tunnelState === 'ERROR'
        ) {
          console.log('❌ Connection failed - tunnel state:', tunnelState);
          break;
        }
        attempts++;
      }

      // If not connected, handle errors
      if (!isConnected) {
        let errorMsg =
          status?.error ||
          `Failed to establish VPN connection. Status: ${
            tunnelState || 'UNKNOWN'
          }`;

        // Provide more helpful error if possible
        let userFriendly = errorMsg;

        // Check for common iOS VPN issues
        if (tunnelState === 'INACTIVE' || tunnelState === 'DOWN') {
          if (
            errorMsg.includes('extension') ||
            errorMsg.includes('provider') ||
            errorMsg.includes('bundle')
          ) {
            userFriendly =
              'Network Extension not configured. Please rebuild the app with proper entitlements.';
          } else if (
            errorMsg.includes('permission') ||
            errorMsg.includes('denied') ||
            errorMsg.includes('not authorized')
          ) {
            userFriendly =
              'VPN permission denied. Go to Settings > General > VPN & Device Management and enable VPN access for ScanVPN.';
          } else {
            userFriendly =
              'VPN connection failed. Please check your configuration and ensure VPN permissions are enabled in iOS Settings.';
          }
        } else if (tunnelState === 'ERROR') {
          userFriendly =
            'VPN connection error. Please check your configuration, network connection, and VPN permissions in iOS Settings.';
        } else if (tunnelState === 'UNKNOWN' || !tunnelState) {
          userFriendly =
            'VPN status unknown. Please ensure VPN permissions are enabled in Settings > General > VPN & Device Management.';
        }

        console.error('❌ VPN connection failed:', {
          tunnelState,
          errorMsg,
          userFriendly,
          status,
        });

        ToastManager.getInstance().showToast(
          userFriendly.split('\n')[0],
          'error',
        );

        throw new Error(userFriendly);
      }

      // Final success actions
      await markProfileUsed(profileId);
      await setActiveProfileId(profileId);

      this.connectionInfo = {
        status: 'connected',
        profileId,
        connectedAt: new Date().toISOString(),
        endpoint: config.peer.endpoint,
        virtualIP: Array.isArray(config.interface.address)
          ? config.interface.address[0]
          : config.interface.address,
      };
      this.updateStatus('connected');

      ToastManager.getInstance().showToast(
        'VPN connected successfully',
        'success',
      );

      return {
        success: true,
        status: 'connected',
      };
    } catch (error) {
      this.updateStatus('error');
      const message =
        error instanceof Error ? error.message : 'Connection failed';
      ToastManager.getInstance().showToast(
        `VPN connection failed: ${message}`,
        'error',
      );
      // Optionally mark module as unavailable if clear linking/module error
      if (
        typeof message === 'string' &&
        (message.includes('linked') ||
          message.includes('module') ||
          message.includes('LINKING_ERROR'))
      ) {
        this.hasNativeModule = false;
      }
      return {
        success: false,
        status: 'error',
        error: message,
      };
    }
  }

  /**
   * Disconnect from VPN
   */
  async disconnect(): Promise<void> {
    if (this.currentStatus === 'disconnected') {
      console.log('ℹ️ Already disconnected, skipping disconnect');
      return;
    }

    try {
      console.log('🔌 Disconnecting from VPN...');
      this.updateStatus('disconnecting');

      if (this.hasNativeModule && WireGuardVpnModule) {
        try {
          // Verify disconnect method exists
          if (typeof WireGuardVpnModule.disconnect !== 'function') {
            throw new Error('WireGuard module missing disconnect method');
          }

          // Disconnect from real VPN
          await WireGuardVpnModule.disconnect();
          console.log('✅ VPN disconnect() call completed');

          // Wait a moment for disconnection to complete
          await new Promise<void>(resolve => setTimeout(resolve, 1000));

          // Verify disconnection
          const status = await WireGuardVpnModule.getStatus();
          const mappedStatus = this.mapWireGuardStatus(status);
          console.log('📊 Disconnect status check:', { status, mappedStatus });

          if (mappedStatus === 'disconnected') {
            ToastManager.getInstance().showToast(
              'VPN disconnected successfully',
              'success',
            );
          } else {
            console.warn('⚠️ VPN may still be connected after disconnect call');
            ToastManager.getInstance().showToast(
              'VPN disconnection initiated. Please check VPN status.',
              'info',
            );
          }
        } catch (nativeDisconnectError) {
          const errorMsg =
            nativeDisconnectError instanceof Error
              ? nativeDisconnectError.message
              : String(nativeDisconnectError);
          console.error('❌ Failed to disconnect from VPN:', errorMsg);

          // Provide helpful error message
          if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
            ToastManager.getInstance().showToast(
              'VPN permission issue. Please check VPN settings in iOS Settings.',
              'warning',
            );
          } else {
            ToastManager.getInstance().showToast(
              'Failed to disconnect from VPN. You may need to disconnect manually in iOS Settings.',
              'warning',
            );
          }
          // Don't throw error, continue with cleanup
        }
      } else {
        console.warn('⚠️ Native VPN module not available for disconnect');
        ToastManager.getInstance().showToast(
          'No active VPN connection to disconnect',
          'info',
        );
      }

      // Clear active profile
      try {
        await setActiveProfileId(null);
        console.log('✅ Active profile cleared');
      } catch (profileError) {
        console.error('❌ Failed to clear active profile:', profileError);
        // Don't show toast for profile cleanup errors - not critical
      }

      // Clear connection info
      this.connectionInfo = null;

      this.updateStatus('disconnected');
      console.log('✅ VPN disconnected and cleaned up');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Disconnect error:', errorMsg);
      ToastManager.getInstance().showToast(
        'Failed to disconnect from VPN. Please check device settings or disconnect manually in iOS Settings.',
        'error',
      );
      this.updateStatus('disconnected'); // Still mark as disconnected for UI
      // Don't throw - allow UI to update
    }
  }

  /**
   * Private: Update status
   */
  private updateStatus(status: ConnectionStatus): void {
    this.currentStatus = status;
  }

  /**
   * Validate VPN configuration for internet connectivity
   */
  private validateConnectionConfig(config: WireGuardConfig): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for required fields
    if (!config.interface.privateKey) {
      issues.push('Private key is missing');
    }

    if (!config.peer.publicKey) {
      issues.push('Public key is missing');
    }

    if (!config.peer.endpoint) {
      issues.push('Server endpoint is missing');
    }

    // Check endpoint format
    const endpointRegex = /^[\w.-]+:\d+$/;
    if (!endpointRegex.test(config.peer.endpoint)) {
      issues.push(
        'Server endpoint format is invalid (should be domain:port or ip:port)',
      );
    }

    // Check interface addresses
    if (!config.interface.address || config.interface.address.length === 0) {
      issues.push('Interface address is missing');
    }

    // Check DNS configuration
    if (!config.interface.dns || config.interface.dns.length === 0) {
      issues.push('No DNS servers configured - internet may not work');
    }

    // Check allowed IPs
    if (!config.peer.allowedIPs || config.peer.allowedIPs.length === 0) {
      issues.push('No allowed IPs configured - traffic routing may be broken');
    }

    const isValid = issues.length === 0;

    if (!isValid) {
      console.warn('⚠️ VPN Configuration Issues:', issues);
      ToastManager.getInstance().showToast(
        `VPN Configuration Issues: ${issues.slice(0, 2).join(', ')}`,
        'warning',
      );
    } else {
      console.log('✅ VPN Configuration is valid');
      ToastManager.getInstance().showToast(
        'VPN configuration validated successfully',
        'success',
      );
    }

    return { isValid, issues };
  }

  /**
   * Convert our WireGuardConfig to the module's expected format
   */
  private convertToWireGuardConfig(config: WireGuardConfig) {
    // Validate endpoint exists and is not empty
    if (!config.peer.endpoint || config.peer.endpoint.trim() === '') {
      throw new Error('Server endpoint is missing or empty');
    }

    const endpointParts = config.peer.endpoint.split(':');
    const serverAddress = endpointParts[0]?.trim();
    const serverPort = parseInt(endpointParts[1] || '51820', 10);

    // Validate server address is not empty
    if (!serverAddress || serverAddress === '') {
      throw new Error(
        `Invalid server endpoint format: "${config.peer.endpoint}". Expected format: "domain:port" or "ip:port"`,
      );
    }

    // Validate server port
    if (isNaN(serverPort) || serverPort < 1 || serverPort > 65535) {
      throw new Error(
        `Invalid server port: ${endpointParts[1]}. Port must be between 1 and 65535`,
      );
    }

    // Ensure DNS servers are always configured for internet access
    const dnsServers =
      config.interface.dns && config.interface.dns.length > 0
        ? config.interface.dns
        : ['1.1.1.1', '8.8.8.8']; // Cloudflare + Google as fallback

    // Ensure allowedIPs includes both IPv4 and IPv6 for full internet access
    const allowedIPs =
      config.peer.allowedIPs && config.peer.allowedIPs.length > 0
        ? config.peer.allowedIPs
        : ['0.0.0.0/0', '::/0']; // All traffic through VPN

    // Set reasonable MTU if not specified
    const mtu = config.interface.mtu || 1420; // Standard WireGuard MTU

    console.log('🔧 Original VPN Configuration:', {
      serverAddress,
      serverPort,
      dns: dnsServers,
      allowedIPs,
      mtu,
      hasPrivateKey: !!config.interface.privateKey,
      hasPublicKey: !!config.peer.publicKey,
      interfaceAddress: config.interface.address?.[0] || 'NOT PROVIDED',
      endpoint: config.peer.endpoint,
    });

    // Create the base configuration with explicit validation
    const baseConfig = {
      privateKey: config.interface.privateKey || '',
      publicKey: config.peer.publicKey || '',
      serverAddress: serverAddress, // Ensure this is never empty
      serverPort: serverPort,
      allowedIPs,
      dns: dnsServers,
      mtu,
      presharedKey: config.peer.preSharedKey,
      // Add interface address separately from routing
      interfaceAddress: config.interface.address?.[0] || '10.0.0.2/32',
    };

    // Validate critical fields before fixing
    if (!baseConfig.serverAddress || baseConfig.serverAddress.trim() === '') {
      throw new Error(
        'Server address cannot be empty. Check endpoint configuration.',
      );
    }

    if (!baseConfig.privateKey || baseConfig.privateKey.trim() === '') {
      throw new Error('Private key cannot be empty');
    }

    if (!baseConfig.publicKey || baseConfig.publicKey.trim() === '') {
      throw new Error('Public key cannot be empty');
    }

    // Fix any configuration issues
    try {
      const fixedConfig = fixVPNConfig(baseConfig);
      console.log('✅ Fixed VPN Configuration:', {
        ...fixedConfig,
        serverAddress: fixedConfig.serverAddress, // Log to verify it's set
      });

      // Double-check serverAddress is still present after fixing
      if (
        !fixedConfig.serverAddress ||
        fixedConfig.serverAddress.trim() === ''
      ) {
        throw new Error('Server address was lost during configuration fix');
      }

      return fixedConfig;
    } catch (error) {
      console.error('❌ Configuration fix failed:', error);
      // Ensure serverAddress is preserved even if fix fails
      if (!baseConfig.serverAddress || baseConfig.serverAddress.trim() === '') {
        throw new Error('Server address is missing in configuration');
      }
      return baseConfig;
    }
  }

  /**
   * Map WireGuard module status to our ConnectionStatus
   */
  private mapWireGuardStatus(wgStatus: any): ConnectionStatus {
    if (wgStatus.isConnected) {
      return 'connected';
    }

    // Handle iOS status values (ACTIVE, CONNECTING, INACTIVE, ERROR, UNKNOWN)
    // and Android status values (UP, DOWN, etc.)
    const tunnelState = wgStatus.tunnelState?.toUpperCase() || '';

    switch (tunnelState) {
      case 'UP':
      case 'ACTIVE':
        return 'connected';
      case 'DOWN':
      case 'INACTIVE':
        return 'disconnected';
      case 'CONNECTING':
        return 'connecting';
      case 'DISCONNECTING':
        return 'disconnecting';
      case 'ERROR':
        return 'error';
      case 'UNKNOWN':
      default:
        return 'disconnected';
    }
  }
}

// Singleton instance
let connectionManager: ConnectionManager | null = null;

/**
 * Get the connection manager instance (internal use only)
 */
function getConnectionManager(): ConnectionManager {
  if (!connectionManager) {
    connectionManager = new ConnectionManager();
  }
  return connectionManager;
}

/**
 * Connect to VPN
 */
export async function connect(
  config: WireGuardConfig,
  profileId: string,
): Promise<ConnectionResult> {
  return getConnectionManager().connect(config, profileId);
}

/**
 * Disconnect from VPN
 */
export async function disconnect(): Promise<void> {
  return getConnectionManager().disconnect();
}

/**
 * Get current connection status
 */
export async function getStatus(): Promise<ConnectionStatus> {
  return await getConnectionManager().getStatus();
}

/**
 * Get connection info
 */
export async function getConnectionInfo(): Promise<ConnectionInfo | null> {
  return await getConnectionManager().getConnectionInfo();
}

/**
 * Initialize VPN service
 */
export async function initializeVpn(): Promise<void> {
  return getConnectionManager().initialize();
}

/**
 * Check if VPN is supported
 */
export async function isVpnSupported(): Promise<boolean> {
  return getConnectionManager().isSupported();
}

/**
 * Get VPN mode information
 */
export function getVpnMode(): {
  hasNativeModule: boolean;
  mode: 'native' | 'fallback';
} {
  return {
    hasNativeModule,
    mode: hasNativeModule ? 'native' : 'fallback',
  };
}

// Re-export ConnectionStatus type for external use
export type { ConnectionStatus } from '../types/wireguard';
