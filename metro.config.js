const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support path aliases
config.resolver.alias = {
  '@': './src',
};

module.exports = config;
