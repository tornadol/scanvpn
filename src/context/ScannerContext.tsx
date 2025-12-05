import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useToast } from '@/components/nativewindui/Toast';
import {
  launchImageLibrary,
  ImagePickerResponse,
  Asset,
} from 'react-native-image-picker';
import { ScannedConfig } from '@/lib/types/wireguard';
import { parseWireGuardConfig } from '@/lib/wireguard/parser';
import { validateWireGuardConfig } from '@/lib/wireguard/validator';
import { saveProfile } from '@/lib/wireguard/storage';
import {
  connect,
  disconnect,
  initializeVpn,
  getVpnMode,
  isVpnSupported,
  getStatus,
  forceVpnManagementActive,
} from '@/lib/wireguard/connection';
import { Platform } from 'react-native';
import jpeg from 'jpeg-js';
import jsQR from 'jsqr';

export type ScreenMode = 'camera' | 'imagePreview' | 'result';

export interface ScannerState {
  // Camera and permissions
  permission: any;
  flashEnabled: boolean;
  isScanning: boolean;

  // QR scanning data
  scannedData: ScannedConfig | null;
  selectedImageUri: string | null;
  screenMode: ScreenMode;

  // Connection states
  isConnecting: boolean;
  isReloading: boolean;
  isUsingNativeVpn: boolean;

  // Form states
  errors: Record<string, string>;
}

export type ScannerAction =
  | { type: 'SET_PERMISSION'; payload: any }
  | { type: 'SET_FLASH_ENABLED'; payload: boolean }
  | { type: 'SET_SCANNING'; payload: boolean }
  | { type: 'SET_SCANNED_DATA'; payload: ScannedConfig | null }
  | { type: 'SET_SELECTED_IMAGE_URI'; payload: string | null }
  | { type: 'SET_SCREEN_MODE'; payload: ScreenMode }
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_RELOADING'; payload: boolean }
  | { type: 'SET_NATIVE_VPN_MODE'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { field: string; error: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'RESET_SCANNER' };

const initialState: ScannerState = {
  permission: null,
  flashEnabled: false,
  isScanning: true,
  scannedData: null,
  selectedImageUri: null,
  screenMode: 'camera',
  isConnecting: false,
  isReloading: false,
  isUsingNativeVpn: false,
  errors: {},
};

function scannerReducer(
  state: ScannerState,
  action: ScannerAction,
): ScannerState {
  switch (action.type) {
    case 'SET_PERMISSION':
      return { ...state, permission: action.payload };

    case 'SET_FLASH_ENABLED':
      return { ...state, flashEnabled: action.payload };

    case 'SET_SCANNING':
      return { ...state, isScanning: action.payload };

    case 'SET_SCANNED_DATA':
      return { ...state, scannedData: action.payload };

    case 'SET_SELECTED_IMAGE_URI':
      return { ...state, selectedImageUri: action.payload };

    case 'SET_SCREEN_MODE':
      return { ...state, screenMode: action.payload };

    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload };

    case 'SET_RELOADING':
      return { ...state, isReloading: action.payload };

    case 'SET_NATIVE_VPN_MODE':
      return { ...state, isUsingNativeVpn: action.payload };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.field]: action.payload.error,
        },
      };

    case 'CLEAR_ERROR':
      const { [action.payload]: _, ...remainingErrors } = state.errors;
      return { ...state, errors: remainingErrors };

    case 'RESET_SCANNER':
      return {
        ...initialState,
        permission: state.permission, // Keep permission state
        isUsingNativeVpn: state.isUsingNativeVpn, // Keep VPN mode
      };

    default:
      return state;
  }
}

// Context interface
export interface ScannerContextType {
  state: ScannerState;
  dispatch: React.Dispatch<ScannerAction>;
  // Actions
  setPermission: (permission: any) => void;
  setFlashEnabled: (enabled: boolean) => void;
  setScanning: (scanning: boolean) => void;
  setScannedData: (data: ScannedConfig | null) => void;
  setSelectedImageUri: (uri: string | null) => void;
  setScreenMode: (mode: ScreenMode) => void;
  setConnecting: (connecting: boolean) => void;
  setReloading: (reloading: boolean) => void;
  setNativeVpnMode: (isNative: boolean) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  resetScanner: () => void;
  // Business logic functions
  initializeVpnService: () => void;
  decodeQrFromImage: (uri: string) => Promise<string | null>;
  handlePickImage: () => Promise<void>;
  handleConnectFromImage: () => Promise<void>;
  handleBarCodeScanned: (result: { data: string }) => void;
  handleConnect: () => Promise<void>;
  handleReload: () => Promise<void>;
  handleRescan: () => void;
}

// Create context
const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

// Provider component
export function ScannerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scannerReducer, initialState);
  const isConnectingRef = useRef(false);
  const { showToast } = useToast();

  // Action creators
  const actions = useMemo(
    () => ({
      setPermission: (permission: any) =>
        dispatch({ type: 'SET_PERMISSION', payload: permission }),
      setFlashEnabled: (enabled: boolean) =>
        dispatch({ type: 'SET_FLASH_ENABLED', payload: enabled }),
      setScanning: (scanning: boolean) =>
        dispatch({ type: 'SET_SCANNING', payload: scanning }),
      setScannedData: (data: ScannedConfig | null) =>
        dispatch({ type: 'SET_SCANNED_DATA', payload: data }),
      setSelectedImageUri: (uri: string | null) =>
        dispatch({ type: 'SET_SELECTED_IMAGE_URI', payload: uri }),
      setScreenMode: (mode: ScreenMode) =>
        dispatch({ type: 'SET_SCREEN_MODE', payload: mode }),
      setConnecting: (connecting: boolean) =>
        dispatch({ type: 'SET_CONNECTING', payload: connecting }),
      setReloading: (reloading: boolean) =>
        dispatch({ type: 'SET_RELOADING', payload: reloading }),
      setNativeVpnMode: (isNative: boolean) =>
        dispatch({ type: 'SET_NATIVE_VPN_MODE', payload: isNative }),
      setError: (field: string, error: string) =>
        dispatch({ type: 'SET_ERROR', payload: { field, error } }),
      clearError: (field: string) =>
        dispatch({ type: 'CLEAR_ERROR', payload: field }),
      resetScanner: () => dispatch({ type: 'RESET_SCANNER' }),
    }),
    [],
  );

  const handleConnect = async () => {
    if (isConnectingRef.current || state.isReloading) {
      console.log('❌ Connection blocked - already connecting/reloading');
      return;
    }
    if (!state.scannedData?.parsed) {
      console.log('❌ Connection blocked - no scanned data');
      return;
    }

    try {
      console.log('✅ Starting connection attempt');
      isConnectingRef.current = true;
      actions.setConnecting(true);

      // Check if already connected - if so, disconnect and replace with new connection
      const currentStatus = await getStatus();
      console.log('📊 Current VPN status:', currentStatus);

      if (currentStatus === 'connected') {
        console.log('🔄 VPN already connected - disconnecting to replace with new connection...');
        showToast(
          'Replacing current VPN connection with new configuration...',
          'info',
        );

        try {
          await disconnect();
          // Brief wait for disconnection to complete
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
        } catch (disconnectError) {
          console.warn('⚠️ Error disconnecting current VPN:', disconnectError);
          // Continue anyway - the new connection should override
        }
      }

      const vpnSupported = await isVpnSupported();
      if (!vpnSupported) {
        throw new Error(
          'WireGuard VPN is not supported on this device. Please check your device settings and ensure VPN permissions are granted.',
        );
      }
      const profileId = await saveProfile(state.scannedData.parsed);

      const result = await connect(state.scannedData.parsed, profileId);
      if (result.success) {
        console.log('✅ VPN connection established successfully');

        // Force VPN Management to show ACTIVE after successful scan and connection
        try {
          console.log(
            '🔄 Forcing VPN Management to ACTIVE state after scan...',
          );
          await forceVpnManagementActive();
          console.log('✅ VPN Management forced to ACTIVE state');
        } catch (forceActiveError) {
          console.warn(
            '⚠️ Could not force VPN Management to ACTIVE:',
            forceActiveError,
          );
        }

        const endpointHost =
          state.scannedData.parsed.peer.endpoint.split(':')[0];
        const facilityName = endpointHost
          .replace(/\.|_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase());

        showToast(
          state.isUsingNativeVpn
            ? `🔐 VPN Connected! Secure tunnel established to ${facilityName}`
            : `📱 WireGuard app opened to connect to ${facilityName}`,
          'success',
        );

        // Clear scanned data and reset UI state after successful connection
        actions.setScannedData(null);
        actions.setSelectedImageUri(null);
        actions.setScreenMode('camera');
        actions.setScanning(true);
      } else {
        console.error('❌ VPN connection failed:', result.error);

        // Enhanced error messages based on error type
        let errorMessage = result.error || 'Could not connect to VPN';
        let suggestions = [];

        if (errorMessage.includes('permission')) {
          suggestions.push('• Grant VPN permission when prompted');
          suggestions.push('• Check device Settings > VPN');
        } else if (errorMessage.includes('WireGuard app')) {
          suggestions.push('• Install WireGuard app from App Store/Play Store');
          suggestions.push('• Ensure WireGuard app is updated');
        } else if (errorMessage.includes('network')) {
          suggestions.push('• Check your internet connection');
          suggestions.push('• Try a different network');
        } else {
          suggestions.push('• Try scanning the QR code again');
          suggestions.push('• Check if the configuration is valid');
        }

        showToast(`Connection Failed: ${errorMessage}`, 'error');
      }
    } catch (error) {
      console.error('💥 Connection error:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      showToast(`Failed to establish VPN connection: ${errorMessage}`, 'error');
    } finally {
      console.log('🏁 Connection attempt finished, resetting connecting state');
      isConnectingRef.current = false;
      actions.setConnecting(false);
    }
  };

  useEffect(() => {
    if (state.scannedData?.parsed) {
      handleConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scannedData]);

  // Business logic functions
  const initializeVpnService = useCallback(() => {
    const initVpn = async () => {
      try {
        // Get VPN mode information
        const vpnMode = getVpnMode();
        await initializeVpn();
        actions.setNativeVpnMode(vpnMode.mode === 'native');
        if (vpnMode.mode === 'native') {
          console.log('Using native WireGuard VPN integration');
        } else {
          console.log('Using WireGuard app integration (Expo Go)');
        }
      } catch (error) {
        console.error('VPN service initialization failed:', error);
        actions.setNativeVpnMode(false);
        console.log(
          'Note: Using WireGuard app integration due to native module limitations',
        );
      }
    };
    initVpn();
  }, [actions]);

  const decodeQrFromImage = async (uri: string): Promise<string | null> => {
    try {
      // Use XMLHttpRequest to read image as array buffer (React Native compatible)
      const uint8Array = await new Promise<Uint8Array>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', uri, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(new Uint8Array(xhr.response));
          } else {
            reject(new Error(`Failed to load image: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error loading image'));
        xhr.send();
      });

      // Decode JPEG
      const rawImageData = jpeg.decode(uint8Array, { useTArray: true });
      const uint8ClampedArray = new Uint8ClampedArray(rawImageData.data.buffer);

      // Scan for QR code
      const qrCode = jsQR(
        uint8ClampedArray,
        rawImageData.width,
        rawImageData.height,
      );
      if (qrCode && qrCode.data) {
        return qrCode.data;
      }
      return null;
    } catch (error) {
      console.error('Error decoding QR from image:', error);
      return null;
    }
  };

  const handlePickImage = async () => {
    try {
      const result: ImagePickerResponse = await new Promise(resolve => {
        launchImageLibrary(
          {
            mediaType: 'photo',
            quality: 1,
            includeBase64: false,
          },
          resolve,
        );
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      if (imageUri) {
        actions.setSelectedImageUri(imageUri);
        actions.setScreenMode('imagePreview');
      }
    } catch (error) {
      console.error('Error in handlePickImage:', error);
      showToast('Failed to open image picker', 'error');
    }
  };

  const handleConnectFromImage = async () => {
    console.log('🖼️ handleConnectFromImage called', {
      isReloading: state.isReloading,
      hasSelectedImage: !!state.selectedImageUri,
      isConnectingRef: isConnectingRef.current,
    });

    // Prevent multiple simultaneous connection attempts with ref protection
    if (isConnectingRef.current || state.isReloading) {
      console.log('❌ Image connection blocked - already connecting/reloading');
      return;
    }
    if (!state.selectedImageUri) {
      console.log('❌ Image connection blocked - no selected image');
      return;
    }

    try {
      actions.setConnecting(true);
      const qrData = await decodeQrFromImage(state.selectedImageUri);
      if (!qrData) {
        showToast(
          'No QR code detected in the selected image. Please try a different image.',
          'warning',
        );
        return;
      }
      const parsed = parseWireGuardConfig(qrData);
      if (!parsed.isValid || !parsed.parsed) {
        showToast(
          parsed.errors.length > 0
            ? parsed.errors.join('\n')
            : 'Could not parse WireGuard configuration',
          'error',
        );
        return;
      }

      const validation = validateWireGuardConfig(parsed.parsed);
      if (!validation.isValid) {
        showToast(validation.errors.join('\n'), 'error');
        return;
      }

      if (validation.warnings.length > 0) {
        console.warn('Configuration warnings:', validation.warnings);
      }
      actions.setScannedData(parsed);
    } catch (scanError) {
      console.error('Error scanning QR code from image:', scanError);
      showToast(
        'Failed to scan QR code from the selected image. Please try a different image.',
        'error',
      );
    } finally {
      actions.setConnecting(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!state.isScanning) return;

    actions.setScanning(false);

    const parsed = parseWireGuardConfig(data);
    if (!parsed.isValid || !parsed.parsed) {
      showToast(
        parsed.errors.length > 0
          ? parsed.errors.join('\n')
          : 'Could not parse WireGuard configuration',
        'error',
      );
      actions.setScanning(true);
      return;
    }

    const validation = validateWireGuardConfig(parsed.parsed);
    if (!validation.isValid) {
      showToast(validation.errors.join('\n'), 'error');
      actions.setScanning(true);
      return;
    }
    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings);
    }

    console.log('Successfully parsed WireGuard config:', parsed.parsed);

    actions.setScannedData(parsed);
    actions.setScreenMode('result');
  };

  const handleReload = async () => {
    if (!state.scannedData?.parsed) return;

    try {
      actions.setReloading(true);

      console.log('🔄 Reloading VPN connection...');

      const profileId = await saveProfile(state.scannedData.parsed);
      const result = await connect(state.scannedData.parsed, profileId);

      if (result.success) {
        console.log('✅ VPN connection reloaded successfully');

        // Force VPN Management to show ACTIVE after successful reload
        try {
          console.log(
            '🔄 Forcing VPN Management to ACTIVE state after reload...',
          );
          await forceVpnManagementActive();
          console.log('✅ VPN Management forced to ACTIVE state');
        } catch (forceActiveError) {
          console.warn(
            '⚠️ Could not force VPN Management to ACTIVE:',
            forceActiveError,
          );
        }

        showToast('VPN connection successfully reloaded', 'success');

        // Clear scanned data and reset UI state after successful reload
        actions.setScannedData(null);
        actions.setSelectedImageUri(null);
        actions.setScreenMode('camera');
        actions.setScanning(true);
      } else {
        console.error('❌ VPN reload failed:', result.error);
        showToast(result.error || 'Failed to reload VPN connection', 'error');

        // Clear scanned data and reset UI state after failed reload
        actions.setScannedData(null);
        actions.setSelectedImageUri(null);
        actions.setScreenMode('camera');
        actions.setScanning(true);
      }
    } catch (error) {
      console.error('💥 Reload error:', error);
      showToast('Failed to reload VPN connection', 'error');

      // Clear scanned data and reset UI state after reload error
      actions.setScannedData(null);
      actions.setSelectedImageUri(null);
      actions.setScreenMode('camera');
      actions.setScanning(true);
    } finally {
      actions.setReloading(false);
    }
  };

  const handleRescan = () => {
    actions.setScannedData(null);
    actions.setSelectedImageUri(null);
    actions.setScreenMode('camera');
    actions.setScanning(true);
  };

  // Initialize VPN service on mount
  useEffect(() => {
    initializeVpnService();
  }, [initializeVpnService]);

  // Log VPN mode changes
  useEffect(() => {
    console.log(
      'VPN Mode:',
      state.isUsingNativeVpn ? 'Native VPN' : 'WireGuard App Integration',
    );
  }, [state.isUsingNativeVpn]);

  const value: ScannerContextType = {
    state,
    dispatch,
    ...actions,
    initializeVpnService,
    decodeQrFromImage,
    handlePickImage,
    handleConnectFromImage,
    handleBarCodeScanned,
    handleConnect,
    handleReload,
    handleRescan,
  };

  return (
    <ScannerContext.Provider value={value}>{children}</ScannerContext.Provider>
  );
}

// Hook to use the scanner context
export function useScanner(): ScannerContextType {
  const context = useContext(ScannerContext);
  if (context === undefined) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}

export default ScannerContext;
