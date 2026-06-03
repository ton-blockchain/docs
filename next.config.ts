import staticConfig from './next.config.static';
import vercelConfig from './next.config.vercel';

const configs = {
  static: staticConfig,
  vercel: vercelConfig,
};

const requestedConfig = process.env.NEXT_CONFIG ?? 'static';

if (!Object.hasOwn(configs, requestedConfig)) {
  throw new Error(
    `Unknown NEXT_CONFIG="${requestedConfig}". Use "static" or "vercel".`
  );
}

export default configs[requestedConfig as keyof typeof configs];
