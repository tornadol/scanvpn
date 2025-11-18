import { useState, useCallback } from 'react';
import { WireGuardConfig } from '@/lib/types/wireguard';
import {
  diagnoseVPNConnection,
  generateVPNHealthReport,
  getRecommendedDNS,
  VPNDiagnosticResult,
} from '@/lib/wireguard/vpnDiagnostics';
import { useToast } from '@/components/nativewindui/Toast';

export function useVPNDiagnostics() {
  const { showToast } = useToast();
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  /**
   * Quick diagnosis of VPN configuration
   */
  const diagnoseConfig = useCallback(
    (config: WireGuardConfig): VPNDiagnosticResult => {
      const diagnosis = diagnoseVPNConnection(config);

      if (!diagnosis.isValid) {
        showToast(
          `VPN Configuration Issues: ${diagnosis.issues
            .slice(0, 2)
            .join(', ')}`,
          'warning',
        );
      } else {
        showToast('VPN configuration looks good!', 'success');
      }

      return diagnosis;
    },
    [showToast],
  );

  /**
   * Run comprehensive VPN health check
   */
  const runHealthCheck = useCallback(
    async (config: WireGuardConfig) => {
      setIsRunningDiagnostics(true);

      try {
        const healthReport = await generateVPNHealthReport(config);
        const { diagnosis, networkTest, recommendations, platformTips } =
          healthReport;

        // Show summary toast
        if (diagnosis.issues.length > 0 || networkTest.issues.length > 0) {
          showToast(
            'VPN connectivity issues detected. Check console for details.',
            'error',
          );
        } else {
          showToast('VPN diagnostics completed successfully!', 'success');
        }

        // Log detailed information
        console.group('🔍 VPN Health Report');
        console.log('📊 Configuration Diagnosis:', diagnosis);
        console.log('🌐 Network Test:', networkTest);
        console.log('💡 Recommendations:', recommendations);
        console.log('📱 Platform Tips:', platformTips);
        console.groupEnd();

        return healthReport;
      } catch (error) {
        console.error('VPN diagnostic failed:', error);
        showToast('Failed to run VPN diagnostics', 'error');
        throw error;
      } finally {
        setIsRunningDiagnostics(false);
      }
    },
    [showToast],
  );

  /**
   * Fix common DNS issues
   */
  const fixDNSIssues = useCallback(
    (
      config: WireGuardConfig,
      dnsType: 'google' | 'cloudflare' | 'quad9' = 'cloudflare',
    ): WireGuardConfig => {
      const recommendedDNS = getRecommendedDNS(dnsType);

      const fixedConfig = {
        ...config,
        interface: {
          ...config.interface,
          dns: recommendedDNS,
        },
      };

      showToast(
        `Updated DNS to ${dnsType} servers: ${recommendedDNS.join(', ')}`,
        'info',
      );
      return fixedConfig;
    },
    [showToast],
  );

  /**
   * Check and show DNS configuration status
   */
  const checkDNSConfiguration = useCallback(
    (config: WireGuardConfig) => {
      const dnsServers = config.interface.dns || [];

      if (dnsServers.length === 0) {
        showToast(
          '⚠️ No DNS servers configured - this may cause internet connectivity issues',
          'warning',
        );
        return false;
      }

      showToast(`✅ DNS configured: ${dnsServers.join(', ')}`, 'success');
      return true;
    },
    [showToast],
  );

  /**
   * Check and show routing configuration
   */
  const checkRoutingConfiguration = useCallback(
    (config: WireGuardConfig) => {
      const allowedIPs = config.peer.allowedIPs;
      const routesAllTraffic =
        allowedIPs.includes('0.0.0.0/0') || allowedIPs.includes('::/0');

      if (routesAllTraffic) {
        showToast('✅ Routing: All traffic through VPN (0.0.0.0/0)', 'success');
      } else {
        showToast(
          `📡 Routing: Specific routes only - ${allowedIPs.join(', ')}`,
          'info',
        );
      }

      return routesAllTraffic;
    },
    [showToast],
  );

  /**
   * Show common troubleshooting steps
   */
  const showTroubleshootingSteps = useCallback(() => {
    const steps = [
      '1. Disconnect and reconnect VPN',
      '2. Check internet connection without VPN',
      '3. Try different DNS servers (1.1.1.1, 8.8.8.8)',
      '4. Verify server endpoint is correct and accessible',
      '5. Check if VPN permissions are granted in device settings',
      '6. Try connecting to different network (Wi-Fi/cellular)',
      '7. Restart the app and device',
      '8. Contact VPN provider if issues persist',
    ];

    showToast('VPN Troubleshooting: Check console for detailed steps', 'info');
    console.group('🔧 VPN Troubleshooting Steps');
    steps.forEach((step, index) => {
      console.log(`${step}`);
    });
    console.groupEnd();
  }, [showToast]);

  return {
    isRunningDiagnostics,
    diagnoseConfig,
    runHealthCheck,
    fixDNSIssues,
    checkDNSConfiguration,
    checkRoutingConfiguration,
    showTroubleshootingSteps,
  };
}
