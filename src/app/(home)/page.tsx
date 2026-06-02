import Link from 'next/link';

export default function HomePage(props: PageProps<'/'>) {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">Hello World</h1>
      <p>
        Open{' '}
        <Link href="/one" className="font-medium underline">
          /one
        </Link>
      </p>
      <p>
        Open{' '}
        <Link href="/two" className="font-medium underline">
          /two
        </Link>
      </p>
    </div>
  );
}

// import type { Metadata } from 'next';
// import { notFound } from 'next/navigation';
// import { createRelativeLink } from 'fumadocs-ui/mdx';
// import { getPageImage, source } from '@/lib/source';
// import { getMDXComponents } from '@/components/mdx';
// import {
//   HomeLayout,
//   // MarkdownCopyButton,
//   // ViewOptionsPopover,
// } from 'fumadocs-ui/layouts/home';

// export default async function Page() {
//   const page = source.getPage([]);
//   if (!page) notFound();

//   const MDX = page.data.body;
//   return (
//     // <main className="container py-12">
//     <HomeLayout>
//       <MDX
//         components={getMDXComponents({
//           // this allows linking to other pages with relative file paths
//           a: createRelativeLink(source, page),
//         })}
//       />
//     </HomeLayout>
//     // </main>
//   )
// }

// export async function generateStaticParams() {
//   return source.generateParams();
// }

// export async function generateMetadata(props: PageProps<'/[...slug]'>): Promise<Metadata> {
//   const params = await props.params;
//   const page = source.getPage(params.slug);
//   if (!page) notFound();

//   return {
//     title: page.data.title,
//     description: page.data.description,
//     openGraph: {
//       images: getPageImage(page).url,
//     },
//   };
// }
