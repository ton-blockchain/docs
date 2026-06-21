'use client';

import Link from 'fumadocs-core/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/components/mdx/icon';
import { cn } from '@/lib/cn';

function isRemoteUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

const COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export type ColumnsProps = HTMLAttributes<HTMLDivElement> & {
  /** Number of columns (1–4) */
  cols?: number;
};

/** Responsive grid of cards */
export function Columns({ cols = 2, className, children, ...props }: ColumnsProps) {
  return (
    <div
      {...props}
      className={cn('grid gap-x-3 gap-y-1 @container', COLS[cols] ?? COLS[2], className)}
    >
      {children}
    </div>
  );
}

/** Two-column preset of `<Columns>` */
export function Cards(props: ColumnsProps) {
  return <Columns cols={2} {...props} />;
}

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  /** Card heading. Prefer a string for accessibility; ReactNode is supported. */
  title?: ReactNode;
  /** Short description rendered above the children. */
  description?: ReactNode;
  /** Lucide icon name, image path (string) or a custom node. */
  icon?: ReactNode | string;
  /** Optional URL. */
  href?: string;
  /** Open in a new tab. Auto-detected for `http(s)` URLs when omitted. */
  external?: boolean;

  /** Top image (Mintlify's `img`). */
  img?: string;
  /** Render as a non-interactive card even when `href` is set. */
  disabled?: boolean;
  /** Call-to-action label rendered at the bottom of the card. */
  cta?: string;
  /** Show the corner arrow. Defaults to `true` for external links. */
  arrow?: boolean;
  /** Lay the icon and content out in a row. */
  horizontal?: boolean;
};

export function Card({
  title,
  description,
  icon,
  href,
  external,
  disabled,
  cta,
  arrow,
  img,
  horizontal,
  className,
  children,
  ...props
}: CardProps) {
  const resolvedHref = disabled ? undefined : href;
  const isExternal = external ?? isRemoteUrl(resolvedHref);
  const showArrow = (arrow ?? isExternal) && !!resolvedHref;

  const Component: ElementType = disabled ? 'div' : resolvedHref ? Link : 'div';
  const linkProps = resolvedHref ? { href: resolvedHref, external: isExternal } : {};
  const renderedIcon =
    icon == null ? null : typeof icon === 'string' ? <Icon icon={icon} size={24} /> : icon;

  return (
    <Component
      {...props}
      {...linkProps}
      data-card
      className={cn(
        'group not-prose relative my-2 block w-full overflow-hidden rounded-xl border bg-fd-card text-fd-card-foreground transition-colors @max-lg:col-span-full',
        resolvedHref && 'cursor-pointer hover:border-fd-primary hover:bg-fd-accent/80',
        disabled && 'opacity-60',
        className,
      )}
    >
      {img ? (
        <img src={img} alt="" className="not-prose w-full object-cover object-center" />
      ) : null}
      <div className={cn('relative p-4', horizontal && 'flex items-center gap-4')}>
        {showArrow ? (
          <div
            aria-hidden
            className="absolute top-2 right-2 text-fd-muted-foreground transition-colors group-hover:text-fd-primary"
          >
            <ArrowUpRight className="size-4" />
          </div>
        ) : null}
        {renderedIcon ? (
          <div
            className={cn(
              'not-prose w-fit shrink-0 text-fd-primary [&_svg]:size-6',
              !horizontal && 'mb-2',
            )}
          >
            {renderedIcon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? (
            <h3
              className={cn('not-prose text-sm font-medium', children || description ? 'mb-1' : '')}
            >
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="my-0! text-sm text-fd-muted-foreground">{description}</p>
          ) : null}
          <div className="text-sm text-fd-muted-foreground prose-no-margin empty:hidden">
            {children}
          </div>
          {cta ? (
            <div className="mt-4">
              <span
                className={cn(
                  'flex items-center gap-2 text-sm font-medium text-fd-muted-foreground',
                  !disabled && 'group-hover:text-fd-primary',
                )}
              >
                {cta}
                <ArrowRight className="size-4" />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Component>
  );
}
