'use client';

import type React from 'react';
import { cn } from '@/lib/cn';

const BADGE_COLORS = [
  'since',
  'gray',
  'blue',
  'green',
  'orange',
  'yellow',
  'red',
  'purple',
  'white',
] as const;
const BADGE_SHAPES = ['rounded', 'pill'] as const;
const BADGE_SIZES = ['xs', 'sm', 'md', 'lg'] as const;
const BADGE_VARIANTS = ['solid', 'outline'] as const;

type BadgeSize = (typeof BADGE_SIZES)[number];
type BadgeShape = (typeof BADGE_SHAPES)[number];
type BadgeVariant = (typeof BADGE_VARIANTS)[number];
type BadgeColor = (typeof BADGE_COLORS)[number];

const sizeVariants: Record<BadgeSize, string> = {
  lg: 'gap-1 py-1 pl-2.5 pr-2.5 [&_svg]:size-3.5 text-sm tracking-[-0.1px] data-[shape="rounded"]:rounded-[8px]',
  md: 'gap-1 py-0.5 pl-2 pr-2 [&_svg]:size-3.5 text-sm tracking-[-0.1px] data-[shape="rounded"]:rounded-[8px]',
  sm: 'gap-[3px] py-0.5 pl-1.5 pr-1.5 [&_svg]:size-3 text-xs data-[shape="rounded"]:rounded-[6px]',
  xs: 'gap-0.5 py-0 pl-1 pr-1 [&_svg]:size-2.5 text-xs data-[shape="rounded"]:rounded-[4px]',
};

const colorVariants: Record<BadgeColor, string> = {
  since: '',
  gray: '[--color-bg:#F5F5F5] dark:[--color-bg:#262727] [--color-text:#78787A] dark:[--color-text:#D7D7D7] [--color-bg-disabled:#F5F5F5] dark:[--color-bg-disabled:#262727] [--color-text-disabled:#E9E9EA] dark:[--color-text-disabled:#3C3C3D]',
  blue: '[--color-bg:#E3EAFD] dark:[--color-bg:#07296A] [--color-text:#133A9A] dark:[--color-text:#7196F4] [--color-bg-disabled:#F0F4FE] dark:[--color-bg-disabled:#03153A] [--color-text-disabled:rgba(51,104,240,0.50)] dark:[--color-text-disabled:rgba(51,104,240,0.30)]',
  green:
    '[--color-bg:#D1FAE4] dark:[--color-bg:#0F4C2C] [--color-text:#166E3F] dark:[--color-text:#6AE1A1] [--color-bg-disabled:#EDFDF4] dark:[--color-bg-disabled:#072213] [--color-text-disabled:rgba(38,189,108,0.50)] dark:[--color-text-disabled:rgba(38,189,108,0.30)]',
  yellow:
    '[--color-bg:#FEF9C3] dark:[--color-bg:#713F12] [--color-text:#A16207] dark:[--color-text:#FDE047] [--color-bg-disabled:#FEFCE8] dark:[--color-bg-disabled:#422006] [--color-text-disabled:#FEF08A] dark:[--color-text-disabled:#854D0E]',
  orange:
    '[--color-bg:#FDEAD8] dark:[--color-bg:#613105] [--color-text:#AE590A] dark:[--color-text:#F8B577] [--color-bg-disabled:#FEF4EC] dark:[--color-bg-disabled:#301903] [--color-text-disabled:rgba(244,142,47,0.50)] dark:[--color-text-disabled:rgba(244,142,47,0.30)]',
  red: '[--color-bg:#FCE5E4] dark:[--color-bg:#64120D] [--color-text:#9A1C13] dark:[--color-text:#F08B85] [--color-bg-disabled:#FDF2F1] dark:[--color-bg-disabled:#360A07] [--color-text-disabled:rgba(230,72,61,0.50)] dark:[--color-text-disabled:rgba(230,72,61,0.30)]',
  purple:
    '[--color-bg:#ECDFFB] dark:[--color-bg:#3A0F71] [--color-text:#5314A3] dark:[--color-text:#B78AF0] [--color-bg-disabled:#ECDFFB] dark:[--color-bg-disabled:#3A0F71] [--color-text-disabled:rgba(135,61,230,0.50)] dark:[--color-text-disabled:rgba(135,61,230,0.30)]',
  white:
    '[--color-bg:rgba(255,255,255,0.95)] dark:[--color-bg:rgba(255,255,255,0.95)] [--color-text:rgba(11,12,14,0.60)] dark:[--color-text:rgba(11,12,14,0.60)] [--color-bg-disabled:rgba(255,255,255,0.08)] dark:[--color-bg-disabled:rgba(255,255,255,0.24)] [--color-text-disabled:#E9E9EA] dark:[--color-text-disabled:#3C3C3D]',
};

export function Badge({
  children,
  className,
  size = 'md',
  shape = 'rounded',
  variant: variantProp,
  color = 'gray',
  since,
}: {
  children: React.ReactNode;
  size?: BadgeSize;
  shape?: BadgeShape;
  variant?: BadgeVariant;
  color?: BadgeColor;
  since?: string;
  className?: string;
}) {
  const variant = variantProp ?? 'solid';
  const commonProps = {
    'data-shape': shape,
    'data-variant': variant,
    className: cn(
      'relative inline-flex w-fit items-center font-medium',
      "data-[shape='pill']:rounded-full",
      "data-[variant='outline']:outline-1 data-[variant='outline']:outline-[rgba(11,12,14,0.08)] data-[variant='outline']:outline-solid data-[variant='outline']:-outline-offset-1 dark:data-[variant='outline']:outline-[rgba(255,255,255,0.14)]",
      'bg-(--color-bg) text-(--color-text)',
      '[&_[data-component-part$="-icon"][data-icon-type="string"]_svg]:bg-(--color-text)',
      '[&_[data-component-part$="-icon"][data-icon-type="inline"]_svg]:fill-current',
      sizeVariants[size],
      colorVariants[since ? 'since' : color],
      className,
    ),
  };

  if (since) {
    return (
      <div
        data-shape={commonProps['data-shape']}
        data-variant={commonProps['data-variant']}
        className={cn(
          commonProps.className,
          'availability-badge not-prose gap-2 px-2.5 py-1 text-xs',
        )}
      >
        <span className="size-1.5 rounded-full bg-fd-primary" />
        <span>Available since {since}</span>
      </div>
    );
  }

  return <span {...commonProps}>{children}</span>;
}

// <span className="inline-block rounded px-1.5 py-0.5 text-xs border">{children}</span>
