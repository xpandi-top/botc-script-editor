/**
 * The hosted agent's tools are this project's MCP server, connected
 * in-process (InMemoryTransport): the same tools, schemas and validation an
 * external agent gets over /mcp, exposed to the model as functions.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolSpec } from './chat'

/** Read-only catalog and script tools, plus drafting an import link (nothing is saved). */
export const AGENT_TOOLS = [
  'list_editions',
  'search_characters',
  'get_character',
  'find_similar_characters',
  'get_jinxes',
  'get_night_order',
  'search_rules',
  'list_scripts',
  'get_script',
  'validate_script',
  'analyze_script',
  'get_token_manifest',
  'create_script_draft',
]

/** Tool output handed back to the model is capped to keep prompts small. */
const MAX_RESULT_CHARS = 6000

export type ToolResult = { ok: boolean; text: string }

export type ToolBridge = {
  specs: ToolSpec[]
  call(name: string, argumentsJson: string): Promise<ToolResult>
  close(): Promise<void>
}

export async function connectTools(server: McpServer, allow: string[] = AGENT_TOOLS): Promise<ToolBridge> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client({ name: 'botc-hosted-agent', version: '1.0.0' })
  await client.connect(clientTransport)
  const { tools } = await client.listTools()
  const allowed = tools.filter((t) => allow.includes(t.name))
  const names = new Set(allowed.map((t) => t.name))
  return {
    specs: allowed.map((t) => {
      const { $schema: _schema, ...parameters } = t.inputSchema as Record<string, unknown>
      return { type: 'function', function: { name: t.name, description: t.description ?? t.title ?? t.name, parameters } }
    }),
    async call(name, argumentsJson) {
      if (!names.has(name)) return { ok: false, text: `Unknown tool "${name}". Available: ${[...names].join(', ')}.` }
      let args: Record<string, unknown>
      try {
        const parsed = argumentsJson.trim() ? JSON.parse(argumentsJson) : {}
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
        args = parsed
      } catch {
        return { ok: false, text: 'Tool arguments must be a JSON object.' }
      }
      const result = await client.callTool({ name, arguments: args })
      const text = (result.content as Array<{ type: string; text?: string }>).map((c) => c.text ?? '').join('\n')
      return { ok: !result.isError, text: text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}… [truncated]` : text }
    },
    close: () => client.close(),
  }
}
