// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .bin files as asset extensions for TensorFlow.js model weights
config.resolver.assetExts.push('bin');

module.exports = config;
