import {source} from "./source"
import type {InferPageType} from "fumadocs-core/source"
import {detectSchemaId, openapiServer, parseOperation} from "./openapi"

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText("processed")
  const openapiSection = await getOpenAPISection(page)

  return `# ${page.data.title} (${page.url})

${processed}${openapiSection}`
}

async function getOpenAPISection(
  page: InferPageType<typeof source>,
): Promise<string> {
  const openapi = page.data.openapi
  if (typeof openapi !== "string") return ""

  const operation = parseOperation(openapi)
  const schemaId = detectSchemaId(openapi)
  if (!operation || !schemaId) return ""

  try {
    const schema = await openapiServer.getSchema(schemaId)
    const pathItem = schema.dereferenced.paths?.[operation.path]
    const op = pathItem?.[operation.method as keyof typeof pathItem]
    if (!op || typeof op !== "object") return ""

    const header = `\n\n## OpenAPI operation\n\n\`${operation.method.toUpperCase()} ${operation.path}\``
    const body = `\n\n\`\`\`json\n${JSON.stringify(op, null, 2)}\n\`\`\``
    return `${header}${body}`
  } catch {
    return ""
  }
}
