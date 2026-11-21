const { withProjectBuildGradle } = require('expo/config-plugins');

const BLUR_VIEW_COORDINATE = 'com.github.Dimezis:BlurView:version-2.0.3';
const START_MARKER = '// @taskgrid: Dojah BlurView compatibility';
const END_MARKER = '// @taskgrid: end Dojah BlurView compatibility';

function addCompatibilityConstraint(contents) {
  const escapedStart = START_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const previousBlock = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, 'g');
  const cleanContents = contents.replace(previousBlock, '').trimEnd();

  const compatibilityBlock = `${START_MARKER}
// Dojah sdk-kotlin v0.4.6 calls BlurView's version-2.0.3 setupWith(ViewGroup,
// BlurAlgorithm) API. BlurView 3.x replaces that API and crashes immediately
// after the user confirms a selfie, so keep Dojah's declared runtime version.
allprojects {
    configurations.configureEach {
        resolutionStrategy.force '${BLUR_VIEW_COORDINATE}'
    }
}
${END_MARKER}`;

  return `${cleanContents}\n\n${compatibilityBlock}\n`;
}

module.exports = function withDojahBlurViewCompatibility(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = addCompatibilityConstraint(
      gradleConfig.modResults.contents,
    );
    return gradleConfig;
  });
};
