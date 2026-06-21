const path = require('path');

// Explicit autolink config for the on-device engine modules.
// RN 0.86 + AGP 8 auto-detection returns an empty android block for these
// (their build.gradle predates the namespace requirement / manifest package is
// gone), so we hand autolink the package classes directly. Without this the
// native libs (librnllama.so / librnwhisper.so) never get compiled into the APK
// and the JS side sees `null` native modules.
const android = (name, importPath, instance) => ({
  platforms: {
    android: {
      sourceDir: path.join(__dirname, 'node_modules', name, 'android'),
      packageImportPath: importPath,
      packageInstance: instance,
    },
  },
});

module.exports = {
  dependencies: {
    'llama.rn': android('llama.rn', 'import com.rnllama.RNLlamaPackage;', 'new RNLlamaPackage()'),
    'whisper.rn': android('whisper.rn', 'import com.rnwhisper.RNWhisperPackage;', 'new RNWhisperPackage()'),
    'react-native-tts': android('react-native-tts', 'import net.no_mad.tts.TextToSpeechPackage;', 'new TextToSpeechPackage()'),
  },
};
