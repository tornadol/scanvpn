/**
 * Configuration Fixer for VPN Internet Connectivity Issues
 *
 * This utility fixes common configuration problems that prevent
 * internet access through VPN on Android.
 */

export interface FixedConfig {
  privateKey: string;
  publicKey: string;
  serverAddress: string;
  serverPort: number;
  interfaceAddress: string;
  allowedIPs: string[];
  dns: string[];
  mtu: number;
  presharedKey?: string;
}

/**
 * Fix common VPN configuration issues
 */
export function fixVPNConfig(originalConfig: any): FixedConfig {
  console.log('🔧 Fixing VPN configuration...');
  console.log('Original config:', originalConfig);

  const fixedConfig: FixedConfig = {
    // Essential fields - must exist
    privateKey: originalConfig.privateKey || '',
    publicKey: originalConfig.publicKey || '',
    serverAddress: originalConfig.serverAddress || '',
    serverPort: parseInt(originalConfig.serverPort) || 51820,

    // Critical addition: Interface address (this was missing!)
    interfaceAddress: originalConfig.interfaceAddress || '10.0.0.2/32',

    // Routing - ensure full tunnel for internet access
    allowedIPs: Array.isArray(originalConfig.allowedIPs) && originalConfig.allowedIPs.length > 0
      ? originalConfig.allowedIPs
      : ['0.0.0.0/0'],  // Default to full tunnel

    // DNS - ensure reliable DNS servers
    dns: Array.isArray(originalConfig.dns) && originalConfig.dns.length > 0
      ? [...new Set([...originalConfig.dns, '1.1.1.1'])] // Add Cloudflare if missing
      : ['1.1.1.1', '8.8.8.8'], // Default DNS servers

    // MTU - optimal for WireGuard
    mtu: originalConfig.mtu || 1420,

    // Optional
    presharedKey: originalConfig.presharedKey
  };

  // Validation
  const issues: string[] = [];

  if (!fixedConfig.privateKey) {
    issues.push('Private key is missing');
  }
  if (!fixedConfig.publicKey) {
    issues.push('Public key is missing');
  }
  if (!fixedConfig.serverAddress) {
    issues.push('Server address is missing');
  }
  if (!fixedConfig.serverPort || fixedConfig.serverPort < 1 || fixedConfig.serverPort > 65535) {
    issues.push('Invalid server port');
  }

  console.log('✅ Fixed configuration:', fixedConfig);

  if (issues.length > 0) {
    console.warn('⚠️ Configuration issues found:', issues);
    throw new Error(`Configuration validation failed: ${issues.join(', ')}`);
  }

  return fixedConfig;
}

/**
 * Create a proper WireGuard config from user input
 */
export function createWireGuardConfig(params: {
  privateKey: string;
  publicKey: string;
  endpoint: string;  // format: "domain:port" or "ip:port"
  clientIP?: string; // format: "10.0.0.2/32"
  dns?: string[];
  allowedIPs?: string[];
  mtu?: number;
  presharedKey?: string;
}): FixedConfig {
  const endpointParts = params.endpoint.split(':');
  const serverAddress = endpointParts[0];
  const serverPort = parseInt(endpointParts[1] || '51820', 10);

  return fixVPNConfig({
    privateKey: params.privateKey,
    publicKey: params.publicKey,
    serverAddress,
    serverPort,
    interfaceAddress: params.clientIP || '10.0.0.2/32',
    allowedIPs: params.allowedIPs || ['0.0.0.0/0'],
    dns: params.dns || ['1.1.1.1', '8.8.8.8'],
    mtu: params.mtu || 1420,
    presharedKey: params.presharedKey
  });
}

/**
 * Your specific configuration fix
 */
export function fixYourConfig() {
  // Your current configuration
  const currentConfig = {
    "allowedIPs": ["0.0.0.0/0"],
    "dns": ["8.8.8.8"],
    "mtu": 1420,
    "presharedKey": undefined,
    "privateKey": "wAQn03tFWcRHM4EkLHUWDlodvwT+XoUKAaQqKZZXGlE=",
    "publicKey": "V3dPGx0FYG5bxmC00gQby4Jn9BL0nQbqEqTyiji9DR4=",
    "serverAddress": "vpn.tyma.vn",
    "serverPort": 51820
  };

  // Fix it
  const fixedConfig = fixVPNConfig(currentConfig);

  console.log('🎯 Fixed configuration for your VPN:');
  console.log(JSON.stringify(fixedConfig, null, 2));

  return fixedConfig;
}