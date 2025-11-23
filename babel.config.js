const nativewindBabel = require('nativewind/babel');

// Get NativeWind babel plugins and filter out optional ones that might not be installed
const nativewindPlugins = nativewindBabel().plugins.filter(plugin => {
  // Filter out react-native-worklets/plugin if not installed
  if (Array.isArray(plugin) && plugin[0] === 'react-native-worklets/plugin') {
    try {
      require.resolve('react-native-worklets/plugin');
      return true;
    } catch {
      return false;
    }
  }
  return true;
});

module.exports = {
  presets: [
    ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    'nativewind/babel',
  ],
  plugins: [
    'react-native-reanimated/plugin',
    ...nativewindPlugins,
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
      },
    ],
  ],
  // Ignore CSS files - they should be handled by NativeWind's Metro transformer, not Babel
  ignore: ['**/*.css'],
};
