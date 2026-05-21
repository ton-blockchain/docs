"use client"

import {
  DefaultResultDisplay,
  type CollapsiblePanelProps,
  type ResultDisplayProps,
} from "fumadocs-openapi/playground/client"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "fumadocs-ui/components/ui/collapsible"
import {ChevronDown} from "lucide-react"
import {useMemo} from "react"
import {cn} from "@/lib/cn"

export function PrettyJsonResultDisplay({data, className, ...rest}: ResultDisplayProps) {
  const prettified = useMemo(() => {
    if (data.type !== "response" || data.body.byteLength === 0) return data
    const contentType = data.headers.get("Content-Type") ?? ""
    if (!/\bjson\b/i.test(contentType)) return data
    try {
      const text = new TextDecoder("utf-8").decode(data.body)
      const pretty = JSON.stringify(JSON.parse(text), null, 2)
      return {...data, body: new TextEncoder().encode(pretty).buffer}
    } catch {
      return data
    }
  }, [data])

  return (
    <DefaultResultDisplay
      data={prettified}
      {...rest}
      className={cn("order-last border-t border-b-0 mt-4", className)}
    />
  )
}

const PRE_EXPANDED_PANELS = new Set<CollapsiblePanelProps["data-type"]>([
  "query",
  "path",
  "header",
  "cookie",
  "body",
])

export function ExpandedByDefaultCollapsiblePanel({
  title,
  children,
  className,
  ...props
}: CollapsiblePanelProps) {
  const shouldExpand = PRE_EXPANDED_PANELS.has(props["data-type"])

  return (
    <Collapsible
      {...props}
      defaultOpen={props.defaultOpen ?? shouldExpand}
      className={cn("border-b last:border-b-0", className)}
    >
      <CollapsibleTrigger className="group w-full flex items-center gap-2 p-3 text-sm font-medium">
        {title}
        <ChevronDown className="ms-auto size-3.5 text-fd-muted-foreground group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 p-3 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
