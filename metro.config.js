const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

// First merge the default config with our custom config
const mergedConfig = mergeConfig(defaultConfig, {
  resolver: {
    alias: {
      '@': './src',
    },
  },
});

// Then wrap with NativeWind - this ensures NativeWind can properly resolve all modules
const config = withNativeWind(mergedConfig, {
  input: './global.css',
  inlineRem: 16,
});


module.exports = config;
