import path from 'node:path';
import { createAsyncAPI } from '@fumadocs/asyncapi/server';

export const asyncapi = createAsyncAPI({
  input: {
    streaming: path.resolve('./content/api/streaming.yaml'),
  },
});
