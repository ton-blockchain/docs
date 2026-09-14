import { writeFileSync } from 'node:fs';
import staticConfig from './next.config.static';
import vercelConfig from './next.config.vercel';

const requestedConfig = process.env.NEXT_CONFIG === 'vercel' ? vercelConfig : staticConfig;
console.log(requestedConfig.env);
writeFileSync('./public/.well-known/build', requestedConfig.env?.NEXT_BUILD_TYPE ?? 'unknown');
export default requestedConfig;
