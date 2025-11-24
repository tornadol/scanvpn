#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const wireguardModulePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-wireguard-vpn',
  'android',
  'src',
  'main',
  'res',
  'xml',
);

const networkSecurityConfigPath = path.join(
  wireguardModulePath,
  'network_security_config.xml',
);

// Create the directory if it doesn't exist
if (!fs.existsSync(wireguardModulePath)) {
  fs.mkdirSync(wireguardModulePath, { recursive: true });
  console.log('Created directory:', wireguardModulePath);
}

// Create the network_security_config.xml file if it doesn't exist
if (!fs.existsSync(networkSecurityConfigPath)) {
  const content = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

  fs.writeFileSync(networkSecurityConfigPath, content, 'utf8');
  console.log('Created network_security_config.xml');
} else {
  console.log('network_security_config.xml already exists');
}
