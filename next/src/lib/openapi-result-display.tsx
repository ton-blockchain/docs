"use client"

import {DefaultResultDisplay, type ResultDisplayProps} from "fumadocs-openapi/playground/client"
import {useMemo} from "react"

export function PrettyJsonResultDisplay({data, ...rest}: ResultDisplayProps) {
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

  return <DefaultResultDisplay data={prettified} {...rest} />
}
