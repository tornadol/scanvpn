import {
  WireGuardConfig,
  ConnectionStatus,
  ConnectionResult,
  ConnectionInfo,
} from '../types/wireguard';
import WireGuardVpnModule from 'react-native-wireguard-vpn-connect';
// // Check if we're running in Expo Go
// const isExpoGo = false;
// const isDevelopmentBuild = !isExpoGo;

// // Try to import WireGuard module (will fail in Expo Go)
// let WireGuardVpnModule: any = null;
// let hasNativeModule = false;

// if (isDevelopmentBuild) {
//   try {
//     WireGuardVpnModule = wgModule.default || wgModule;
//     hasNativeModule = true;
//     console.log(
//       'WireGuard native module loaded successfully (Development Build)',
//     );
//   } catch (error) {
//     console.log('WireGuard native module not available:', error);
//     hasNativeModule = false;
//   }
// } else {
//   console.log(
//     'Running without native WireGuard module - VPN will not be available',
//   );
//   hasNativeModule = false;
// }

// /**
//  * Native VPN Connection Manager
//  *
//  * This implementation requires the native WireGuard module:
//  * - Development Builds: Uses native WireGuard module for real VPN tunnels
//  * - iOS: NEVPNManager / Network Extension
//  * - Android: VpnService API
//  *
//  * No fallback to external WireGuard app is provided.
//  */

// type ConnectionChangeCallback = (status: ConnectionStatus) => void;

// class ConnectionManager {
//   private currentStatus: ConnectionStatus = 'disconnected';
//   private connectionInfo: ConnectionInfo | null = null;
//   private listeners: Set<ConnectionChangeCallback> = new Set();
//   private isInitialized = false;
//   private hasNativeModule = hasNativeModule;

//   /**
//    * Initialize the VPN service
//    */
//   async initialize(): Promise<void> {
//     if (!this.isInitialized) {
//       if (this.hasNativeModule && WireGuardVpnModule) {
//         try {
//           await WireGuardVpnModule.initialize();
//           this.isInitialized = true;
//           console.log('WireGuard VPN service initialized successfully');
//         } catch (error) {
//           console.error('Failed to initialize VPN service:', error);

//           this.isInitialized = true;
//           this.hasNativeModule = false; // Mark as unavailable
//         }
//       } else {
//         this.isInitialized = true;
//         console.log('WireGuard VPN module not available');
//       }
//     }
//   }
// }

export async function testModuleReplacement() {
  // const test = await WireGuardVpnModule.initialize();
  // console.log('test initialize', test);
}
