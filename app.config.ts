import type { ConfigContext, ExpoConfig } from 'expo/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins ?? [])];
  const mapLibrePlugin = '@maplibre/maplibre-react-native';

  if (!plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === mapLibrePlugin)) {
    plugins.push(mapLibrePlugin);
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
