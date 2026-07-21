'use client';
import { CircleCheck, CircleX, Info, Lightbulb, TriangleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type CalloutType = 'info' | 'warn' | 'error' | 'success' | 'warning' | 'idea';

const iconClass = 'size-5 -me-0.5 fill-(--callout-color) text-fd-card';

/**
 * Only use `note`, `tip`, `caution`, or `danger` as the `type=`.
 */
export function Callout({
  children,
  title,
  ...props
}: { title?: ReactNode } & Omit<CalloutContainerProps, 'title'>) {
  return (
    <CalloutContainer {...props}>
      {title && <CalloutTitle>{title}</CalloutTitle>}
      <CalloutDescription>{children}</CalloutDescription>
    </CalloutContainer>
  );
}

export interface CalloutContainerProps extends ComponentProps<'div'> {
  /**
   * @defaultValue info
   */
  type?: CalloutType;

  /**
   * Force an icon
   */
  icon?: ReactNode;
}

function resolveAlias(type: CalloutType) {
  if (type === 'warn') return 'warning';
  if ((type as unknown) === 'caution') return 'warning';
  if ((type as unknown) === 'danger') return 'warning';
  if ((type as unknown) === 'note') return 'info';
  if ((type as unknown) === 'tip') return 'idea';
  return type;
}

export function CalloutContainer({
  type: inputType = 'info',
  icon,
  children,
  className,
  style,
  ...props
}: CalloutContainerProps) {
  const type = resolveAlias(inputType);
  return (
    <div
      className={cn(
        'flex gap-2 my-4 rounded-xl border bg-fd-card p-3 ps-2 text-sm text-fd-card-foreground shadow-md',
        className,
      )}
      style={
        {
          '--callout-color': {
            info: 'var(--color-fd-info, var(--color-fd-primary))',
            warning: 'var(--color-fd-warning, var(--color-fd-primary))',
            error: 'var(--color-fd-error, var(--color-fd-primary))',
            success: 'var(--color-fd-success, var(--color-fd-primary))',
            idea: 'var(--color-fd-idea, var(--color-fd-primary))',
          }[(inputType as unknown) === 'danger' ? 'error' : type],
          ...style,
        } as object
      }
      {...props}
    >
      {icon ??
        {
          info: <Info className={cn(iconClass, 'text-fd-card')} />,
          warning: <TriangleAlert className={cn(iconClass, 'text-fd-card')} />,
          error: <CircleX className={cn(iconClass, 'text-fd-card')} />,
          success: <CircleCheck className={cn(iconClass, 'text-fd-card')} />,
          idea: <Lightbulb className={cn(iconClass, 'text-(--callout-color)')} />,
        }[type]}
      <div className="flex flex-col gap-2 min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function CalloutTitle({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('font-medium my-0!', className)} {...props}>
      {children}
    </p>
  );
}

export function CalloutDescription({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <div
      className={cn(
        'text-fd-muted-foreground prose-no-margin empty:hidden leading-6 [&_code]:py-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
