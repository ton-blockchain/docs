import { getLLMText, getIndexablePages } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const scan = getIndexablePages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\n\n'));
}
