import { createAPIPage } from 'fumadocs-openapi/ui';
import { openapi, codeUsages } from '@/lib/openapi';
import client from './api-page.client';

export const APIPage = createAPIPage(openapi, {
  client,
  codeUsages,
});
