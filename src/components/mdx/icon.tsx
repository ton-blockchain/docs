'use client';

import { icons, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

function kebabToPascal(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-]/g, '')
    .split(/[-_/]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function isImageSource(icon: string): boolean {
  return (
    icon.startsWith('/') ||
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    /\.(png|jpe?g|svg|webp|gif|avif)$/i.test(icon)
  );
}

/**
 * Some FontAwesome icon names differ from their Lucide equivalents.
 * TODO: this is a temporary mapping, and a proper solution would be to either
 * start using FontAwesome icon sets or change all iconds in the whole docs to Lucide.
 */
const ICON_ALIASES: Record<string, string> = {
  mobile: 'Smartphone',
  'paper-plane': 'Send',
  desktop: 'Monitor',
  'magnifying-glass': 'Search',
  gear: 'Settings',
  bolt: 'Zap',
  rotate: 'RotateCw',
  flask: 'FlaskConical',
  'signal-stream': 'RadioTower',
  'user-group': 'Users',
  'chart-line': 'ChartLine',
  'file-pdf': 'FileText',
  'list-ol': 'ListOrdered',
  message: 'MessageSquare',
  'input-text': 'FormInput',
  'arrow-left-arrow-right': 'ArrowLeftRight',
  'chart-diagram': 'Workflow',
  'building-columns': 'Landmark',
  'layer-group': 'Layers',
  'table-cells': 'Grid3x3',
  'floppy-disk': 'Save',
  'file-js': 'FileCode',
  // Brand icons that Lucide does not ship are mapped to the closest generic glyph:
  react: 'Atom',
  github: 'GitBranch',
  npm: 'Package',
  js: 'Braces',
  telegram: 'Send',
  'square-n': 'SquareCode',
};

/**
 * An `<Icon>` component ported from Mintlify to Fumadocs. Only uses the Lucide icon set.
 *
 * Does a kebab-case → PascalCase translation, e.g. `circle-arrow-up` → `CircleArrowUp`.
 * Fallbacks to rendering a small filled square so the page always renders.
 */
export function Icon({
  icon,
  size = 16,
  color,
  className,
}: {
  icon: string;
  size?: number | string;
  color?: string;
  className?: string;
}) {
  const numericSize = typeof size === 'number' ? size : Number.parseFloat(size) || 16;

  // Render image-source icons, e.g., `/images/foo.png`.
  if (isImageSource(icon)) {
    return (
      <img
        src={icon}
        alt=""
        width={numericSize}
        height={numericSize}
        className={cn('inline-block object-contain align-middle', className)}
        aria-hidden
      />
    );
  }

  const pascal = ICON_ALIASES[icon] ?? kebabToPascal(icon);
  const Lucide = (icons as Record<string, LucideIcon | undefined>)[pascal];

  if (Lucide) {
    return (
      <Lucide
        width={numericSize}
        height={numericSize}
        color={color}
        className={cn('inline-block align-middle', className ?? 'text-fd-primary')}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn('inline-block align-middle rounded-sm bg-fd-muted', className)}
      style={{ width: numericSize, height: numericSize, backgroundColor: color }}
      aria-label={icon}
      role="img"
    />
  );
}
