import { NextResponse } from 'next/server'
import { createN8nMCPClient } from '@/lib/n8n-mcp'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.N8N_MCP_URL
  if (!url) {
    return NextResponse.json({ connected: false, reason: 'N8N_MCP_URL not set' })
  }

  try {
    const client = await createN8nMCPClient()
    if (!client) {
      return NextResponse.json({ connected: false, reason: 'N8N_MCP_URL not set' })
    }
    const tools = await client.tools()
    await client.close()
    return NextResponse.json({
      connected: true,
      url,
      toolCount: Object.keys(tools).length,
      toolNames: Object.keys(tools),
    })
  } catch (err) {
    return NextResponse.json({
      connected: false,
      reason: err instanceof Error ? err.message : 'Connection failed',
    })
  }
}
