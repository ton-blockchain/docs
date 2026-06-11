import staticConfig from './next.config.static';
import vercelConfig from './next.config.vercel';

const requestedConfig =
  process.env.NEXT_CONFIG === 'vercel' ? vercelConfig : staticConfig;
export default requestedConfig;
