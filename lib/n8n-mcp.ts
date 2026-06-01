import { createMCPClient } from '@ai-sdk/mcp'

export type N8nMCPConfig = {
  url: string
  apiKey?: string
}

function getN8nConfig(): N8nMCPConfig | null {
  const url = process.env.N8N_MCP_URL
  if (!url) return null
  return { url, apiKey: process.env.N8N_API_KEY }
}

/**
 * Create a short-lived MCP client pointed at the n8n SSE endpoint.
 * Caller is responsible for calling client.close() when done.
 * Returns null when N8N_MCP_URL is not configured.
 */
export async function createN8nMCPClient() {
  const cfg = getN8nConfig()
  if (!cfg) return null

  const headers: Record<string, string> = {}
  if (cfg.apiKey) headers['X-N8N-API-KEY'] = cfg.apiKey

  return createMCPClient({
    transport: {
      type: 'sse',
      url: cfg.url,
      ...(Object.keys(headers).length ? { headers } : {}),
    },
  })
}

/** Fetch n8n tools. Returns an empty object when n8n is not configured. */
export async function getN8nTools() {
  const client = await createN8nMCPClient()
  if (!client) return { tools: {}, close: () => {} }
  const tools = await client.tools()
  return { tools, close: () => client.close() }
}
