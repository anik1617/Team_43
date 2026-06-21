// Temporarily skip autolinking the heavy native modules (llama.rn / whisper.rn) so design+engine
// builds stay fast. Re-enable (delete the relevant entries) when wiring voice + the on-device model.
module.exports = {
  dependencies: {
    'llama.rn': { platforms: { android: null } },
    'whisper.rn': { platforms: { android: null } },
    'react-native-tts': { platforms: { android: null } },
  },
};
