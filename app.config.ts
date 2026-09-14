import type { ConfigContext, ExpoConfig } from 'expo/config';

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
    plugins,
  };
};
