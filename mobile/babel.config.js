module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Keep reanimated last.
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@contexts': './src/contexts',
            '@navigation': './src/navigation',
            '@lib': './src/lib',
            '@store': './src/store',
            '@hooks': './src/hooks',
          },
        },
      ],
      'babel-plugin-transform-import-meta',
      'nativewind/babel',
      'react-native-reanimated/plugin',
    ],
  };
};
