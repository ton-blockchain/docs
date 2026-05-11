import type {BaseLayoutProps} from "fumadocs-ui/layouts/shared"
import {ThemeLogo} from "@/components/ThemeLogo"

export const logo = <ThemeLogo />

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          {logo}
          <span className="text-lg font-semibold tracking-tight">Docs</span>
        </>
      ),
    },
    links: [
      {
        type: "main",
        text: "Docs for LLMs",
        url: "/llms.txt",
        external: true,
      },
    ],
  }
}
