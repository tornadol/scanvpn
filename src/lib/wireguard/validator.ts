import { WireGuardConfig, ValidationResult } from '../types/wireguard';

/**
 * Validate a WireGuard configuration
 * Checks for proper format of keys, IPs, endpoints, etc.
 */
export function validateWireGuardConfig(config: WireGuardConfig): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate Interface
  validateInterface(config.interface, result);

  // Validate Peer
  validatePeer(config.peer, result);

  // Set overall validity
  result.isValid = result.errors.length === 0;

  return result;
}

function validateInterface(
  iface: WireGuardConfig['interface'],
  result: ValidationResult
): void {
  // Validate PrivateKey
  if (!iface.privateKey) {
    result.errors.push('PrivateKey is required');
  } else if (!isValidBase64Key(iface.privateKey)) {
    result.errors.push('PrivateKey must be a valid base64 string (44 characters)');
  }

  // Validate Address
  if (!iface.address || iface.address.length === 0) {
    result.errors.push('At least one Address is required');
  } else {
    for (const addr of iface.address) {
      if (!isValidCIDR(addr)) {
        result.errors.push(`Invalid Address CIDR notation: ${addr}`);
      }
    }
  }

  // Validate DNS (optional)
  if (iface.dns) {
    for (const dns of iface.dns) {
      if (!isValidIP(dns)) {
        result.warnings.push(`DNS address may be invalid: ${dns}`);
      }
    }
  }

  // Validate MTU (optional)
  if (iface.mtu !== undefined) {
    if (iface.mtu < 576 || iface.mtu > 65535) {
      result.warnings.push(`MTU should be between 576 and 65535, got ${iface.mtu}`);
    }
  }

  // Validate ListenPort (optional)
  if (iface.listenPort !== undefined) {
    if (iface.listenPort < 1 || iface.listenPort > 65535) {
      result.errors.push(`ListenPort must be between 1 and 65535, got ${iface.listenPort}`);
    }
  }
}

function validatePeer(peer: WireGuardConfig['peer'], result: ValidationResult): void {
  // Validate PublicKey
  if (!peer.publicKey) {
    result.errors.push('PublicKey is required');
  } else if (!isValidBase64Key(peer.publicKey)) {
    result.errors.push('PublicKey must be a valid base64 string (44 characters)');
  }

  // Validate PreSharedKey (optional)
  if (peer.preSharedKey && !isValidBase64Key(peer.preSharedKey)) {
    result.errors.push('PreSharedKey must be a valid base64 string (44 characters)');
  }

  // Validate Endpoint
  if (!peer.endpoint) {
    result.errors.push('Endpoint is required');
  } else if (!isValidEndpoint(peer.endpoint)) {
    result.errors.push(`Invalid Endpoint format: ${peer.endpoint} (expected "host:port")`);
  }

  // Validate AllowedIPs
  if (!peer.allowedIPs || peer.allowedIPs.length === 0) {
    result.errors.push('At least one AllowedIP is required');
  } else {
    for (const ip of peer.allowedIPs) {
      if (!isValidCIDR(ip)) {
        result.errors.push(`Invalid AllowedIP CIDR notation: ${ip}`);
      }
    }
  }

  // Validate PersistentKeepalive (optional)
  if (peer.persistentKeepalive !== undefined) {
    if (peer.persistentKeepalive < 0 || peer.persistentKeepalive > 65535) {
      result.warnings.push(
        `PersistentKeepalive should be between 0 and 65535, got ${peer.persistentKeepalive}`
      );
    }
  }
}

/**
 * Check if a string is a valid base64-encoded WireGuard key (44 characters)
 */
function isValidBase64Key(key: string): boolean {
  // WireGuard keys are 32 bytes encoded in base64, resulting in 44 characters (including padding)
  const base64Regex = /^[A-Za-z0-9+/]{42}[A-Za-z0-9+/=]{2}$/;
  return base64Regex.test(key);
}

/**
 * Check if a string is a valid IP address (IPv4 or IPv6)
 */
function isValidIP(ip: string): boolean {
  // Simple IPv4 check
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // Simple IPv6 check (basic)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * Check if a string is valid CIDR notation (IP/prefix)
 */
function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split('/');
  if (parts.length !== 2) return false;

  const [ip, prefix] = parts;
  const prefixNum = parseInt(prefix, 10);

  // Check IP validity
  if (!isValidIP(ip)) return false;

  // Check prefix validity
  if (isNaN(prefixNum)) return false;

  // IPv4 prefix: 0-32
  if (ip.includes('.')) {
    return prefixNum >= 0 && prefixNum <= 32;
  }

  // IPv6 prefix: 0-128
  return prefixNum >= 0 && prefixNum <= 128;
}

/**
 * Check if endpoint is in valid "host:port" format
 */
function isValidEndpoint(endpoint: string): boolean {
  const colonIndex = endpoint.lastIndexOf(':');
  if (colonIndex <= 0 || colonIndex === endpoint.length - 1) {
    return false;
  }

  const host = endpoint.substring(0, colonIndex);
  const portStr = endpoint.substring(colonIndex + 1);

  // Validate port
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return false;
  }

  // Validate host (IP or domain name)
  // Allow valid IP addresses
  if (isValidIP(host)) return true;

  // Allow valid domain names (simple check)
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(host);
}