import { source, processLLMLinks } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export function GET() {
  return new Response(processLLMLinks(llms(source).index()), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
