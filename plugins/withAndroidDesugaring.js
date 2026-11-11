const {
  withAppBuildGradle,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const DESUGAR_VERSION = '2.1.5';
const DESUGAR_COORDINATE = `com.android.tools:desugar_jdk_libs:${DESUGAR_VERSION}`;
const START_MARKER = '// @taskgrid: Android desugaring alignment';
const END_MARKER = '// @taskgrid: end Android desugaring alignment';

function replaceDesugaringVersion(contents) {
  return contents.replace(
    /com\.android\.tools:desugar_jdk_libs:[^'"\s)]+/g,
    DESUGAR_COORDINATE,
  );
}

function addGlobalDesugaringConstraint(contents) {
  const escapedStart = START_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const previousBlock = new RegExp(
    `${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`,
    'g',
  );
  const cleanContents = contents.replace(previousBlock, '').trimEnd();

  const constraintBlock = `${START_MARKER}
// Dojah's Android SDK requires desugar_jdk_libs 2.1.5 or newer. Apply the
// version to every Android subproject so app and library metadata agree.
allprojects {
    configurations.configureEach {
        resolutionStrategy.force '${DESUGAR_COORDINATE}'
    }
}
${END_MARKER}`;

  return `${cleanContents}\n\n${constraintBlock}\n`;
}

module.exports = function withAndroidDesugaring(config) {
  config = withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = replaceDesugaringVersion(
      gradleConfig.modResults.contents,
    );
    return gradleConfig;
  });

  return withProjectBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = addGlobalDesugaringConstraint(
      replaceDesugaringVersion(gradleConfig.modResults.contents),
    );
    return gradleConfig;
  });
};
