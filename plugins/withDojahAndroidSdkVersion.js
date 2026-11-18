const {
  WarningAggregator,
  withProjectBuildGradle,
} = require('expo/config-plugins');

// dojah-kyc-sdk-react-expo 0.1.23 pins the Android SDK to v0.4.5.
// Dojah v0.4.6 and v0.4.7 fix captured selfie/video URI handling. Without
// that fix the native preview can start its loader without submitting any
// media, leaving the user on an endless spinner after pressing Continue.
const DOJAH_ANDROID_SDK_VERSION = 'v0.4.7';
const DOJAH_ANDROID_SDK =
  `com.github.dojah-inc:sdk-kotlin:${DOJAH_ANDROID_SDK_VERSION}`;
const START_MARKER = '// @taskgrid: Dojah Android capture fix';
const END_MARKER = '// @taskgrid: end Dojah Android capture fix';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addDojahVersionOverride(contents) {
  const previousBlock = new RegExp(
    `${escapeRegExp(START_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}\\s*`,
    'g',
  );
  const cleanContents = contents.replace(previousBlock, '').trimEnd();

  const overrideBlock = `${START_MARKER}
// The Expo bridge currently requests v0.4.5. Force Dojah's later compatible
// release so Android can read both file:// and content:// captures and can
// surface video recording failures instead of spinning forever.
allprojects {
    repositories {
        // The Dojah Android SDK is published by JitPack. Restrict this group
        // to its actual repository so Gradle does not query Google Maven first.
        exclusiveContent {
            forRepository {
                maven {
                    name = 'DojahJitPack'
                    url = uri('https://jitpack.io')
                }
            }
            filter {
                includeGroup 'com.github.dojah-inc'
            }
        }
    }
    configurations.configureEach {
        resolutionStrategy.force '${DOJAH_ANDROID_SDK}'
    }
}
${END_MARKER}`;

  return `${cleanContents}\n\n${overrideBlock}\n`;
}

module.exports = function withDojahAndroidSdkVersion(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'withDojahAndroidSdkVersion',
        `TaskGrid could not pin ${DOJAH_ANDROID_SDK}. Add a Gradle dependency resolution rule manually.`,
      );
      return gradleConfig;
    }

    gradleConfig.modResults.contents = addDojahVersionOverride(
      gradleConfig.modResults.contents,
    );
    return gradleConfig;
  });
};
