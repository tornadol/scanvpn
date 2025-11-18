import { WireGuardConfig, ScannedConfig } from '../types/wireguard';

/**
 * Parse WireGuard configuration from QR code data
 * Expected format:
 * [Interface]
 * PrivateKey = ...
 * Address = ...
 * DNS = ...
 *
 * [Peer]
 * PublicKey = ...
 * Endpoint = ...
 * AllowedIPs = ...
 */
export function parseWireGuardConfig(qrData: string): ScannedConfig {
  const result: ScannedConfig = {
    raw: qrData,
    parsed: null,
    isValid: false,
    errors: [],
  };

  try {
    // Split into lines and filter empty lines
    const lines = qrData
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    // Initialize config structure
    const config: Partial<WireGuardConfig> = {
      interface: {
        privateKey: '',
        address: [],
      },
      peer: {
        publicKey: '',
        endpoint: '',
        allowedIPs: [],
      },
    };

    let currentSection: 'interface' | 'peer' | null = null;

    for (const line of lines) {
      // Check for section headers
      if (line.toLowerCase() === '[interface]') {
        currentSection = 'interface';
        continue;
      }
      if (line.toLowerCase() === '[peer]') {
        currentSection = 'peer';
        continue;
      }

      // Parse key-value pairs
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();

      if (!currentSection) {
        result.errors.push(`Key "${key}" found outside of [Interface] or [Peer] section`);
        continue;
      }

      // Parse Interface section
      if (currentSection === 'interface') {
        switch (key.toLowerCase()) {
          case 'privatekey':
            config.interface!.privateKey = value;
            break;
          case 'address':
            config.interface!.address = value.split(',').map((addr) => addr.trim());
            break;
          case 'dns':
            config.interface!.dns = value.split(',').map((dns) => dns.trim());
            break;
          case 'mtu':
            config.interface!.mtu = parseInt(value, 10);
            break;
          case 'listenport':
            config.interface!.listenPort = parseInt(value, 10);
            break;
          default:
            // Ignore unknown keys
            break;
        }
      }

      // Parse Peer section
      if (currentSection === 'peer') {
        switch (key.toLowerCase()) {
          case 'publickey':
            config.peer!.publicKey = value;
            break;
          case 'presharedkey':
            config.peer!.preSharedKey = value;
            break;
          case 'endpoint':
            config.peer!.endpoint = value;
            break;
          case 'allowedips':
            config.peer!.allowedIPs = value.split(',').map((ip) => ip.trim());
            break;
          case 'persistentkeepalive':
            config.peer!.persistentKeepalive = parseInt(value, 10);
            break;
          default:
            // Ignore unknown keys
            break;
        }
      }
    }

    // Validate required fields
    if (!config.interface?.privateKey) {
      result.errors.push('Missing required field: PrivateKey in [Interface]');
    }
    if (!config.interface?.address || config.interface.address.length === 0) {
      result.errors.push('Missing required field: Address in [Interface]');
    }
    if (!config.peer?.publicKey) {
      result.errors.push('Missing required field: PublicKey in [Peer]');
    }
    if (!config.peer?.endpoint) {
      result.errors.push('Missing required field: Endpoint in [Peer]');
    }
    if (!config.peer?.allowedIPs || config.peer.allowedIPs.length === 0) {
      result.errors.push('Missing required field: AllowedIPs in [Peer]');
    }

    // If no errors, mark as valid and set parsed config
    if (result.errors.length === 0) {
      result.parsed = config as WireGuardConfig;
      result.isValid = true;
    }
  } catch (error) {
    result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Extract endpoint hostname from full endpoint string
 * @param endpoint - Format: "domain:port" or "ip:port"
 * @returns The hostname/IP without port
 */
export function getEndpointHost(endpoint: string): string {
  const colonIndex = endpoint.lastIndexOf(':');
  return colonIndex > 0 ? endpoint.substring(0, colonIndex) : endpoint;
}

/**
 * Extract port from endpoint string
 * @param endpoint - Format: "domain:port" or "ip:port"
 * @returns The port number or null if not found
 */
export function getEndpointPort(endpoint: string): number | null {
  const colonIndex = endpoint.lastIndexOf(':');
  if (colonIndex > 0) {
    const port = parseInt(endpoint.substring(colonIndex + 1), 10);
    return isNaN(port) ? null : port;
  }
  return null;
}