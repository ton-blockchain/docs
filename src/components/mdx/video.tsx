'use client';

import type { ComponentProps } from 'react';
import { withBasePath } from '@/lib/shared';

export function Video({ src, poster, children, ...props }: ComponentProps<'video'>) {
  return (
    <video
      {...props}
      {...(typeof src === 'string' ? { src: withBasePath(src) } : {})}
      {...(typeof poster === 'string' ? { poster: withBasePath(poster) } : {})}
    >
      {children}
    </video>
  );
}
