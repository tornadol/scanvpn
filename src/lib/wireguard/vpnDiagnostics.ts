import { WireGuardConfig } from '@/lib/types/wireguard';
import { Platform } from 'react-native';

export interface VPNDiagnosticResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  config: {
    dnsServers: string[];
    hasDNS: boolean;
    hasIPv6: boolean;
    allowedIPs: string[];
    routesAllTraffic: boolean;
    persistentKeepalive: boolean;
    mtu: boolean;
  };
}

/**
 * Diagnose VPN configuration for potential internet connectivity issues
 */
export function diagnoseVPNConnection(
  config: WireGuardConfig,
): VPNDiagnosticResult {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // DNS Analysis
  const dnsServers = config.interface.dns || [];
  const hasDNS = dnsServers.length > 0;

  if (!hasDNS) {
    issues.push('No DNS servers configured');
    suggestions.push('Add DNS servers (e.g., 8.8.8.8, 1.1.1.1)');
  }

  // Check DNS server validity
  const invalidDNS = dnsServers.filter(dns => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return !ipv4Regex.test(dns) && !ipv6Regex.test(dns);
  });

  if (invalidDNS.length > 0) {
    issues.push(`Invalid DNS server format: ${invalidDNS.join(', ')}`);
    suggestions.push('Use valid IP addresses for DNS servers');
  }

  // Allowed IPs Analysis
  const allowedIPs = config.peer.allowedIPs;
  const routesAllTraffic =
    allowedIPs.includes('0.0.0.0/0') || allowedIPs.includes('::/0');

  if (!routesAllTraffic && allowedIPs.length === 0) {
    issues.push('No allowed IPs configured');
    suggestions.push('Add allowed IPs or use 0.0.0.0/0 for all traffic');
  }

  // Check IPv6 support
  const hasIPv6 =
    allowedIPs.some(ip => ip.includes(':')) ||
    dnsServers.some(dns => dns.includes(':'));

  // Persistent Keepalive
  const hasKeepalive = !!(
    config.peer.persistentKeepalive && config.peer.persistentKeepalive > 0
  );

  if (!hasKeepalive) {
    suggestions.push(
      'Consider adding persistent keepalive (25 seconds) for NAT traversal',
    );
  }

  // MTU Analysis
  const hasMTU = !!(config.interface.mtu && config.interface.mtu > 0);

  // Interface Address Analysis
  const interfaceAddresses = config.interface.address || [];
  if (interfaceAddresses.length === 0) {
    issues.push('No interface addresses configured');
    suggestions.push('Add interface IP address with CIDR notation');
  }

  const diagnostic: VPNDiagnosticResult = {
    isValid: issues.length === 0,
    issues,
    suggestions,
    config: {
      dnsServers,
      hasDNS,
      hasIPv6,
      allowedIPs,
      routesAllTraffic,
      persistentKeepalive: hasKeepalive,
      mtu: hasMTU,
    },
  };

  return diagnostic;
}

/**
 * Generate recommended DNS servers based on region/preference
 */
export function getRecommendedDNS(
  type: 'google' | 'cloudflare' | 'quad9' | 'custom' = 'cloudflare',
): string[] {
  switch (type) {
    case 'google':
      return ['8.8.8.8', '8.8.4.4'];
    case 'cloudflare':
      return ['1.1.1.1', '1.0.0.1'];
    case 'quad9':
      return ['9.9.9.9', '149.112.112.112'];
    case 'custom':
    default:
      return ['1.1.1.1', '8.8.8.8']; // Cloudflare primary, Google secondary
  }
}

/**
 * Get platform-specific VPN recommendations
 */
export function getPlatformRecommendations(): string[] {
  const recommendations = [
    'Ensure VPN permissions are granted in device settings',
    'Check if your device allows VPN connections',
  ];

  if (Platform.OS === 'ios') {
    recommendations.push(
      'Go to Settings > VPN & Device Management',
      'Enable VPN in device settings if disabled',
      'Check iOS VPN permissions in Settings > Privacy & Security',
    );
  } else {
    recommendations.push(
      'Check if VPN is enabled in device settings',
      'Verify network permissions for the app',
      'Some Android versions may require additional VPN permissions',
    );
  }

  return recommendations;
}

/**
 * Common VPN connectivity troubleshooting steps
 */
export function getTroubleshootingSteps(): string[] {
  return [
    '1. Check if VPN is connected in device settings',
    '2. Verify internet connection works without VPN',
    '3. Try different DNS servers (1.1.1.1, 8.8.8.8)',
    '4. Check allowedIPs configuration (0.0.0.0/0 for all traffic)',
    '5. Verify server endpoint is accessible',
    '6. Check if firewall blocks VPN traffic',
    '7. Try connecting to different network (Wi-Fi/cellular)',
    '8. Restart the app and device',
    '9. Update VPN configuration if server details changed',
  ];
}

/**
 * Test basic network connectivity (simulated)
 */
export function testNetworkConnectivity(): Promise<{
  internetAvailable: boolean;
  dnsWorking: boolean;
  issues: string[];
}> {
  return new Promise(resolve => {
    // Simulate network tests - in real implementation, you'd use actual ping/HTTP requests
    setTimeout(() => {
      const issues: string[] = [];
      let internetAvailable = true;
      let dnsWorking = true;

      // Simulate common issues
      if (Math.random() < 0.1) {
        internetAvailable = false;
        issues.push('No internet connection');
      }

      if (Math.random() < 0.1) {
        dnsWorking = false;
        issues.push('DNS resolution failed');
      }

      resolve({
        internetAvailable,
        dnsWorking,
        issues,
      });
    }, 1000);
  });
}

/**
 * Generate a comprehensive VPN health report
 */
export async function generateVPNHealthReport(
  config: WireGuardConfig,
): Promise<{
  diagnosis: VPNDiagnosticResult;
  networkTest: Awaited<ReturnType<typeof testNetworkConnectivity>>;
  recommendations: string[];
  platformTips: string[];
  troubleshooting: string[];
}> {
  const diagnosis = diagnoseVPNConnection(config);
  const networkTest = await testNetworkConnectivity();
  const recommendations = getTroubleshootingSteps();
  const platformTips = getPlatformRecommendations();

  return {
    diagnosis,
    networkTest,
    recommendations,
    platformTips,
    troubleshooting: recommendations,
  };
}
