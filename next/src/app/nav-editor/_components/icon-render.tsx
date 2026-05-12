"use client"
import {icons} from "lucide-react"
import type {ComponentProps} from "react"

/**
 * Render any Lucide icon by name. Falls back to a placeholder dot if the name
 * is not a valid Lucide icon.
 */
export function IconRender({
  name,
  className,
  size = 16,
  ...rest
}: {name?: string | null; className?: string; size?: number} & Omit<ComponentProps<"svg">, "name">) {
  if (!name) {
    return (
      <span
        aria-hidden
        className={`inline-block rounded-full bg-fd-muted/60 ${className ?? ""}`}
        style={{width: size, height: size}}
      />
    )
  }
  const Comp = (icons as Record<string, React.ComponentType<ComponentProps<"svg">>>)[
    toPascalCase(name)
  ]
  if (!Comp) {
    return (
      <span
        aria-hidden
        className={`inline-block rounded-full bg-fd-warning/40 ${className ?? ""}`}
        style={{width: size, height: size}}
        title={`unknown icon: ${name}`}
      />
    )
  }
  return <Comp width={size} height={size} className={className} {...rest} />
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}
