const { withGradleProperties } = require('expo/config-plugins');

const buildProperties = {
  'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8',
  'org.gradle.parallel': 'false',
  'org.gradle.workers.max': '2',
  'kotlin.compiler.execution.strategy': 'in-process',
};

module.exports = function withAndroidBuildMemory(config) {
  return withGradleProperties(config, (gradleConfig) => {
    const managedKeys = new Set(Object.keys(buildProperties));
    gradleConfig.modResults = gradleConfig.modResults.filter(
      (entry) => entry.type !== 'property' || !managedKeys.has(entry.key),
    );

    for (const [key, value] of Object.entries(buildProperties)) {
      gradleConfig.modResults.push({ type: 'property', key, value });
    }

    return gradleConfig;
  });
};
