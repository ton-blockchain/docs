'use client';
import * as React from 'react';
import { ArrowUpCircleIcon } from 'lucide-react';

export function ScrollTop({ ...props }: React.ComponentPropsWithRef<'button'>) {
  const handleScrollToTop = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <button
      className="flex not-prose items-center gap-1.5 text-fd-muted-foreground text-sm transition-colors hover:text-fd-foreground cursor-pointer"
      onClick={handleScrollToTop}
      type="button"
      {...props}
    >
      <ArrowUpCircleIcon className="size-3.5" />
      <span>Scroll to top</span>
    </button>
  );
}
