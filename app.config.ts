import type { ConfigContext, ExpoConfig } from 'expo/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins ?? [])];
  const requiredPlugins = [
    '@maplibre/maplibre-react-native',
    '@react-native-community/datetimepicker',
  ];

  for (const pluginName of requiredPlugins) {
    if (!plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === pluginName)) {
      plugins.push(pluginName);
    }
  }
  if (
    !plugins.some(
      (plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-speech-recognition',
    )
  ) {
    plugins.push([
      'expo-speech-recognition',
      {
        microphonePermission:
          'Allow TaskGrid to hear your task description while you hold the microphone button.',
        speechRecognitionPermission:
          'Allow TaskGrid to turn your spoken task description into editable text.',
        androidSpeechServicePackages: [
          'com.google.android.googlequicksearchbox',
          'com.google.android.as',
          'com.samsung.android.bixby.agent',
        ],
      },
    ]);
  }

  return {
    ...config,
    name: config.name ?? 'TaskGrid',
    slug: config.slug ?? 'taskgrid-mobile',
    android: {
      ...config.android,
      ...(existsSync(resolve(process.cwd(), 'google-services.json'))
        ? { googleServicesFile: './google-services.json' }
        : {}),
    },
    plugins,
  };
};
