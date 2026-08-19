import { getSearchablePages } from '@/lib/source';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  const documents = await Promise.all(
    getSearchablePages().map(async (page) => ({
      id: page.url,
      url: page.url,
      title: page.data.title.replace(/`/g, ''),
      description: page.data.description,
      text: await page.data.getText('processed'),
    })),
  );

  return Response.json({ version: 1, documents });
}
