import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { runAxe } from '../harness/audit.ts'
import { newPage, preparePage } from '../harness/browser.ts'
import { observeKeyboard } from '../harness/keyboard.ts'
import { serveDir } from '../harness/serve.ts'

// The tools show the agent raw observations about its current working copy.
// They never reveal pass thresholds, expected element lists or fixture internals

async function withPage<T>(workdir: string, fn: (page: import('playwright').Page, url: string) => Promise<T>): Promise<T> {
  const server = await serveDir(workdir)
  const { context, page } = await newPage()
  try {
    return await fn(page, server.url)
  } finally {
    await context.close()
    await server.close()
  }
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] }
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  return { content: [{ type: 'text' as const, text: `tool failed: ${message}` }], isError: true }
}

export function makeA11yServer(getWorkdir: () => string) {
  const auditPage = tool(
    'audit_page',
    'Serve the current working copy and run an axe-core accessibility scan (WCAG 2.1 A and AA plus best-practice rules). Returns every violation with rule id, impact, sample selectors and guidance, plus a count of needs-review items.',
    {},
    async () => {
      try {
        const summary = await withPage(getWorkdir(), async (page, url) => {
          await preparePage(page, url)
          return runAxe(page)
        })
        if (summary.violations === 0) {
          return textResult(
            `axe found 0 violation nodes. ${summary.incomplete} item(s) need manual review. Automated scanning misses most keyboard and focus behavior, verify those separately.`
          )
        }
        const lines = summary.rules.map(rule =>
          `- ${rule.id} (${rule.impact}), ${rule.nodes} node(s): ${rule.help}\n  selectors: ${rule.targets.join(' | ')}`
        )
        return textResult(
          `axe found ${summary.violations} violation node(s) and ${summary.incomplete} needs-review item(s):\n${lines.join('\n')}`
        )
      } catch (err) {
        return errorResult(err)
      }
    }
  )

  const checkKeyboard = tool(
    'check_keyboard',
    'Serve the current working copy and observe real keyboard behavior: the Tab order, which data-track elements cannot be reached, whether Enter and Space activate each data-track element, and which elements show no visible focus indicator.',
    {},
    async () => {
      try {
        const obs = await withPage(getWorkdir(), (page, url) => observeKeyboard(page, url))
        const lines: string[] = []
        lines.push(`tab order (${obs.tabOrder.length} stops): ${obs.tabOrder.join(' -> ') || 'nothing is focusable'}`)
        lines.push(`data-track elements in the page: ${obs.tracksInDom.join(', ') || 'none'}`)
        lines.push(
          obs.unreachableTracks.length > 0
            ? `NOT reachable with Tab: ${obs.unreachableTracks.join(', ')}`
            : 'every data-track element is reachable with Tab'
        )
        for (const a of obs.activation) {
          lines.push(`activation: ${a.track} + ${a.key} -> ${a.activated ? 'activated' : 'NO effect'}`)
        }
        lines.push(
          obs.noFocusIndicator.length > 0
            ? `no visible focus indicator on: ${obs.noFocusIndicator.join(', ')}`
            : 'every reached element shows a visible focus indicator'
        )
        return textResult(lines.join('\n'))
      } catch (err) {
        return errorResult(err)
      }
    }
  )

  const previewPage = tool(
    'preview_page',
    'Serve the current working copy and return a screenshot of the rendered page so you can confirm the visual design is intact.',
    {},
    async () => {
      try {
        const data = await withPage(getWorkdir(), async (page, url) => {
          await preparePage(page, url)
          const buffer = await page.screenshot({ fullPage: false })
          return buffer.toString('base64')
        })
        return { content: [{ type: 'image' as const, data, mimeType: 'image/png' as const }] }
      } catch (err) {
        return errorResult(err)
      }
    }
  )

  return createSdkMcpServer({
    name: 'a11y',
    version: '1.0.0',
    tools: [auditPage, checkKeyboard, previewPage]
  })
}

export const ALL_TOOL_NAMES = ['audit_page', 'check_keyboard', 'preview_page']
