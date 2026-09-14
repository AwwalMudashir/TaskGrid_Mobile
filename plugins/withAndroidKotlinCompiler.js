const { withProjectBuildGradle } = require('expo/config-plugins');

const KOTLIN_VERSION = '2.2.10';
const START_MARKER = '// @taskgrid: Kotlin Gradle Plugin alignment';
const END_MARKER = '// @taskgrid: end Kotlin Gradle Plugin alignment';

const kotlinCompilerBlock = `${START_MARKER}
// Dojah's current Android SDK requires Kotlin 2.2.10 or newer. Keep the compiler
// on the buildscript classpath aligned with Expo's supported Kotlin/KSP/Pika
// toolchain, including after expo prebuild regenerates the Android project.
buildscript {
    dependencies {
        constraints {
            classpath("org.jetbrains.kotlin:kotlin-gradle-plugin") {
                version {
                    require "${KOTLIN_VERSION}"
                }
            }
        }
    }
}
${END_MARKER}`;

module.exports = function withAndroidKotlinCompiler(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    const escapedStart = START_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedEnd = END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const previousBlock = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, 'g');
    const contents = gradleConfig.modResults.contents.replace(previousBlock, '').trimEnd();

    gradleConfig.modResults.contents = `${contents}\n\n${kotlinCompilerBlock}\n`;
    return gradleConfig;
  });
};
