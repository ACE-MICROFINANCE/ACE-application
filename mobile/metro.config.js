const { getDefaultConfig } = require('expo/metro-config');

const path = require('path');
const config = getDefaultConfig(__dirname);

// Force Metro to prefer CommonJS entrypoints (avoid ESM bundles that use import.meta)
config.resolver.unstable_enablePackageExports = false;

if (!config.resolver.sourceExts.includes('mjs')) {
  config.resolver.sourceExts.push('mjs');
}
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@react-native/debugger-frontend': path.resolve(__dirname, 'src/shims/debugger-frontend.js'),
  // Force zustand to use the CJS build (avoids import.meta in the ESM bundle on web/Hermes)
  zustand: path.resolve(__dirname, 'src/shims/zustand.js'),
};

module.exports = config;

