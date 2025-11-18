import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { WireGuardConfig } from '@/lib/types/wireguard';
import { saveProfile } from '@/lib/wireguard/storage';
import { connect, disconnect, getStatus } from '@/lib/wireguard/connection';
import { useToast } from '@/components/nativewindui/Toast';
import { useVPNDiagnostics } from '@/hooks/useVPNDiagnostics';

export interface VPNConfigForm {
  privateKey: string;
  publicKey: string;
  address: string;
  dns: string;
  endpoint: string;
  allowedIPs: string;
  persistentKeepalive: string;
  presharedKey: string;
  name: string;
}

export interface SettingsState {
  // Connection states
  isConnecting: boolean;
  isConnected: boolean;

  // Form state
  form: VPNConfigForm;
  errors: Partial<VPNConfigForm>;

  // UI states
  isLoading: boolean;
  lastProfileId: string | null;
}

export type SettingsAction =
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_FORM'; payload: Partial<VPNConfigForm> }
  | { type: 'SET_FORM_FIELD'; payload: { field: keyof VPNConfigForm; value: string } }
  | { type: 'SET_ERRORS'; payload: Partial<VPNConfigForm> }
  | { type: 'SET_ERROR'; payload: { field: keyof VPNConfigForm; error: string | undefined } }
  | { type: 'CLEAR_ERROR'; payload: keyof VPNConfigForm }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'RESET_FORM' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LAST_PROFILE_ID'; payload: string | null };

const initialForm: VPNConfigForm = {
  privateKey: '',
  publicKey: '',
  address: '',
  dns: '1.1.1.1,8.8.8.8',
  endpoint: '',
  allowedIPs: '0.0.0.0/0',
  persistentKeepalive: '25',
  presharedKey: '',
  name: 'My VPN Configuration',
};

const initialState: SettingsState = {
  isConnecting: false,
  isConnected: false,
  form: initialForm,
  errors: {},
  isLoading: false,
  lastProfileId: null,
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload };

    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };

    case 'SET_FORM':
      return { ...state, form: { ...state.form, ...action.payload } };

    case 'SET_FORM_FIELD':
      return {
        ...state,
        form: { ...state.form, [action.payload.field]: action.payload.value },
        // Clear error for this field when user starts typing
        ...(state.errors[action.payload.field]
          ? {
              errors: { ...state.errors, [action.payload.field]: undefined },
            }
          : {}),
      };

    case 'SET_ERRORS':
      return { ...state, errors: action.payload };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.field]: action.payload.error },
      };

    case 'CLEAR_ERROR':
      const { [action.payload]: _, ...remainingErrors } = state.errors;
      return { ...state, errors: remainingErrors };

    case 'CLEAR_ALL_ERRORS':
      return { ...state, errors: {} };

    case 'RESET_FORM':
      return { ...state, form: initialForm, errors: {} };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_LAST_PROFILE_ID':
      return { ...state, lastProfileId: action.payload };

    default:
      return state;
  }
}

// Context interface
export interface SettingsContextType {
  state: SettingsState;
  dispatch: React.Dispatch<SettingsAction>;
  // Actions
  setConnecting: (connecting: boolean) => void;
  setConnected: (connected: boolean) => void;
  setForm: (form: Partial<VPNConfigForm>) => void;
  setFormField: (field: keyof VPNConfigForm, value: string) => void;
  setErrors: (errors: Partial<VPNConfigForm>) => void;
  setError: (field: keyof VPNConfigForm, error: string | undefined) => void;
  clearError: (field: keyof VPNConfigForm) => void;
  clearAllErrors: () => void;
  resetForm: () => void;
  setLoading: (loading: boolean) => void;
  setLastProfileId: (profileId: string | null) => void;
  // Business logic functions
  validateForm: () => boolean;
  handleSubmit: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
  checkConnectionStatus: () => Promise<void>;
  // Diagnostic functions
  runDiagnostics: () => Promise<void>;
  checkDNSConfiguration: () => void;
  showTroubleshootingSteps: () => void;
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const { showToast } = useToast();
  const {
    runHealthCheck,
    showTroubleshootingSteps
  } = useVPNDiagnostics();

  // Action creators
  const actions = {
    setConnecting: (connecting: boolean) =>
      dispatch({ type: 'SET_CONNECTING', payload: connecting }),
    setConnected: (connected: boolean) => dispatch({ type: 'SET_CONNECTED', payload: connected }),
    setForm: (form: Partial<VPNConfigForm>) => dispatch({ type: 'SET_FORM', payload: form }),
    setFormField: (field: keyof VPNConfigForm, value: string) =>
      dispatch({ type: 'SET_FORM_FIELD', payload: { field, value } }),
    setErrors: (errors: Partial<VPNConfigForm>) =>
      dispatch({ type: 'SET_ERRORS', payload: errors }),
    setError: (field: keyof VPNConfigForm, error: string | undefined) =>
      dispatch({ type: 'SET_ERROR', payload: { field, error } }),
    clearError: (field: keyof VPNConfigForm) => dispatch({ type: 'CLEAR_ERROR', payload: field }),
    clearAllErrors: () => dispatch({ type: 'CLEAR_ALL_ERRORS' }),
    resetForm: () => dispatch({ type: 'RESET_FORM' }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setLastProfileId: (profileId: string | null) =>
      dispatch({ type: 'SET_LAST_PROFILE_ID', payload: profileId }),
  };

  // Business logic functions
  const validateForm = (): boolean => {
    const newErrors: Partial<VPNConfigForm> = {};

    if (!state.form.privateKey.trim()) {
      newErrors.privateKey = 'Private key is required';
    } else if (!/^[A-Za-z0-9+/]+={0,20}$/.test(state.form.privateKey)) {
      newErrors.privateKey = 'Invalid private key format';
    }

    if (!state.form.publicKey.trim()) {
      newErrors.publicKey = 'Public key is required';
    } else if (!/^[A-Za-z0-9+/]+={0,20}$/.test(state.form.publicKey)) {
      newErrors.publicKey = 'Invalid public key format';
    }

    if (!state.form.address.trim()) {
      newErrors.address = 'IP address is required';
    } else if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/\d{1,3}$/.test(state.form.address)) {
      newErrors.address = 'Invalid IP address format (e.g., 10.0.0.2/24)';
    }

    if (!state.form.endpoint.trim()) {
      newErrors.endpoint = 'Endpoint is required';
    } else if (!/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}:\d{1,5}$/.test(state.form.endpoint)) {
      newErrors.endpoint = 'Invalid endpoint format (e.g., vpn.example.com:51820)';
    }

    if (!state.form.allowedIPs.trim()) {
      newErrors.allowedIPs = 'Allowed IPs are required';
    }

    if (state.form.persistentKeepalive && !/^\d+$/.test(state.form.persistentKeepalive)) {
      newErrors.persistentKeepalive = 'Must be a number';
    }

    if (state.form.presharedKey && !/^[A-Za-z0-9+/]+={0,20}$/.test(state.form.presharedKey)) {
      newErrors.presharedKey = 'Invalid preshared key format';
    }

    actions.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkConnectionStatus = async () => {
    try {
      const status = await getStatus();
      actions.setConnected(status === 'connected');
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      actions.setConnecting(true);

      // Check if already connected
      const currentStatus = await getStatus();
      console.log('📊 Current VPN status (Settings):', currentStatus);

      if (currentStatus === 'connected') {
        showToast('Please disconnect from current VPN before creating a new configuration', 'warning');
        actions.setConnecting(false);
        return;
      }

      // Convert form to WireGuard config
      const wgConfig: WireGuardConfig = {
        interface: {
          privateKey: state.form.privateKey.trim(),
          address: [state.form.address.trim()],
          dns: state.form.dns.trim() ? [state.form.dns.trim()] : [],
        },
        peer: {
          publicKey: state.form.publicKey.trim(),
          endpoint: state.form.endpoint.trim(),
          allowedIPs: [state.form.allowedIPs.trim()],
          persistentKeepalive: state.form.persistentKeepalive
            ? parseInt(state.form.persistentKeepalive, 10)
            : undefined,
          preSharedKey: state.form.presharedKey.trim() || undefined,
        },
      };

      // Save configuration
      const profileId = await saveProfile(wgConfig, state.form.name.trim());

      console.log('🔧 Manual configuration connecting:', {
        name: state.form.name.trim(),
        endpoint: wgConfig.peer.endpoint,
        profileId,
      });

      // Connect to VPN
      const result = await connect(wgConfig, profileId);

      if (result.success) {
        actions.setConnected(true);
        actions.setLastProfileId(profileId);

        showToast(
          `VPN connected to ${state.form.endpoint} successfully!`,
          'success'
        );

        // Optional: Navigate back or reset form
        actions.resetForm();
      } else {
        showToast(result.error || 'Failed to connect to VPN', 'error');
      }
    } catch (error) {
      console.error('Connection error:', error);
      showToast(error instanceof Error ? error.message : 'An unknown error occurred', 'error');
    } finally {
      actions.setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      actions.setConnecting(true);
      await disconnect();

      actions.setConnected(false);

      showToast('VPN disconnected successfully', 'success');
    } catch (error) {
      console.error('Disconnect error:', error);
      showToast('Failed to disconnect from VPN', 'error');
    } finally {
      actions.setConnecting(false);
    }
  };

  // Diagnostic functions
  const runDiagnostics = async () => {
    const config: WireGuardConfig = {
      interface: {
        privateKey: state.form.privateKey.trim(),
        address: [state.form.address.trim()],
        dns: state.form.dns.trim() ? state.form.dns.trim().split(',').map(d => d.trim()) : [],
      },
      peer: {
        publicKey: state.form.publicKey.trim(),
        endpoint: state.form.endpoint.trim(),
        allowedIPs: [state.form.allowedIPs.trim()],
        persistentKeepalive: state.form.persistentKeepalive
          ? parseInt(state.form.persistentKeepalive, 10)
          : undefined,
        preSharedKey: state.form.presharedKey.trim() || undefined,
      },
    };

    await runHealthCheck(config);
  };

  const checkDNSConfiguration = () => {
    const dnsServers = state.form.dns.trim() ? state.form.dns.trim().split(',').map(d => d.trim()) : [];

    if (dnsServers.length === 0) {
      showToast('⚠️ No DNS servers configured - this may cause internet connectivity issues', 'warning');
    } else {
      showToast(`✅ DNS configured: ${dnsServers.join(', ')}`, 'success');
    }
  };

  const value: SettingsContextType = {
    state,
    dispatch,
    ...actions,
    validateForm,
    handleSubmit,
    handleDisconnect,
    checkConnectionStatus,
    runDiagnostics,
    checkDNSConfiguration,
    showTroubleshootingSteps,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// Hook to use the settings context
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;
