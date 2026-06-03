import staticConfig from './next.config.static';
import vercelConfig from './next.config.vercel';

const configs = {
  static: staticConfig,
  vercel: vercelConfig,
};

const requestedConfig = process.env.NEXT_CONFIG === 'vercel' ? 'vercel' : 'static';

export default configs[requestedConfig];
