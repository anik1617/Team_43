// Lets Metro bundle the whisper.cpp model (assets/models/*.bin) into the app, so speech
// recognition works with no network.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('bin');

module.exports = config;
