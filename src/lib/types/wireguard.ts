/**
 * WireGuard Configuration Types
 * Defines the structure for WireGuard VPN configurations
 */

export interface WireGuardInterface {
  /** Base64-encoded private key (44 characters) */
  privateKey: string;
  /** IP addresses with CIDR notation (e.g., ["10.0.0.2/32"]) */
  address: string[];
  /** DNS servers (optional) */
  dns?: string[];
  /** MTU size (optional) */
  mtu?: number;
  /** Listen port (optional) */
  listenPort?: number;
}

export interface WireGuardPeer {
  /** Base64-encoded public key (44 characters) */
  publicKey: string;
  /** Pre-shared key for additional security (optional) */
  preSharedKey?: string;
  /** Endpoint in format "domain:port" or "ip:port" */
  endpoint: string;
  /** Allowed IPs with CIDR notation (e.g., ["0.0.0.0/0", "::/0"]) */
  allowedIPs: string[];
  /** Persistent keepalive interval in seconds (optional) */
  persistentKeepalive?: number;
}

export interface WireGuardConfig {
  interface: WireGuardInterface;
  peer: WireGuardPeer;
}

export interface ScannedConfig {
  /** Raw QR code data */
  raw: string;
  /** Parsed configuration (null if parsing failed) */
  parsed: WireGuardConfig | null;
  /** Whether the configuration is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
}

export interface ValidationResult {
  /** Whether the configuration passes validation */
  isValid: boolean;
  /** List of critical errors */
  errors: string[];
  /** List of warnings (non-critical issues) */
  warnings: string[];
}

export interface VPNProfile {
  /** Unique identifier */
  id: string;
  /** User-friendly name */
  name: string;
  /** WireGuard configuration */
  config: WireGuardConfig;
  /** Creation timestamp (ISO string) */
  createdAt: string;
  /** Last used timestamp (ISO string, optional) */
  lastUsed?: string;
  /** Whether this profile is currently active/connected */
  isActive: boolean;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

export interface ConnectionResult {
  /** Whether the connection attempt was successful */
  success: boolean;
  /** Current connection status */
  status: ConnectionStatus;
  /** Error message if connection failed */
  error?: string;
}

export interface ConnectionInfo {
  /** Current connection status */
  status: ConnectionStatus;
  /** Profile ID of active connection */
  profileId?: string;
  /** Connection start time (ISO string) */
  connectedAt?: string;
  /** Connection duration in milliseconds */
  duration?: number;
  /** Endpoint currently connected to */
  endpoint?: string;
  /** Virtual IP address assigned */
  virtualIP?: string;
}
