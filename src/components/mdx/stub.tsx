'use client';
import { Callout } from './callout';
import { gitConfig } from '@/lib/shared';

export const Stub = ({ issue }: { issue: string }) => {
  const issueEl = issue ? (
    <>
      Track progress on this page in{' '}
      <a href={`https://github.com/${gitConfig.user}/${gitConfig.repo}/issues/${issue}`}>
        issue #{issue}
      </a>
      .
    </>
  ) : null;

  return (
    // @ts-ignore
    <Callout>
      This page is a placeholder. {issueEl}
      {/* @ts-ignore */}
    </Callout>
  );
};
