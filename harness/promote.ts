import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { archiveDir, copyDir, isMain, runsDir } from './util.ts'

// Promotes a finished run into the committed archive so judges can re-score it
// without credentials, and renders each trajectory.jsonl into a readable walkthrough

function roleFor(runName: string): 'before' | 'baseline' | 'agent' | null {
  if (runName === 'before') return 'before'
  if (runName.startsWith('baseline')) return 'baseline'
  if (runName.startsWith('agent')) return 'agent'
  return null
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)} ...` : clean
}

type ContentBlock = { type?: string, text?: string, name?: string, input?: unknown, content?: unknown, is_error?: boolean }

function blockLines(blocks: ContentBlock[], out: string[]): void {
  for (const block of blocks) {
    if (block.type === 'text' && block.text) {
      out.push(`> ${truncate(block.text, 600)}`)
      out.push('')
    }
    if (block.type === 'tool_use') {
      out.push(`- tool call: **${block.name}** ${truncate(JSON.stringify(block.input ?? {}), 300)}`)
    }
    if (block.type === 'tool_result') {
      const inner = Array.isArray(block.content)
        ? (block.content as ContentBlock[]).map(c => (c.type === 'text' ? c.text ?? '' : `[${c.type}]`)).join(' ')
        : String(block.content ?? '')
      out.push(`- tool result${block.is_error ? ' (error)' : ''}: ${truncate(inner, 400)}`)
    }
  }
}

export function renderTrajectoryMd(jsonlPath: string, caseId: string): string {
  const out: string[] = [`# Trajectory: ${caseId}`, '']
  const lines = readFileSync(jsonlPath, 'utf8').split('\n').filter(Boolean)
  let turn = 0
  for (const line of lines) {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(line) as Record<string, unknown>
    } catch {
      continue
    }
    const type = msg.type as string | undefined
    if (type === 'system' && msg.subtype === 'init') {
      out.push(`Session started with model ${String(msg.model ?? 'unknown')}.`)
      out.push('')
    } else if (type === 'baseline_single_call') {
      out.push(`Single structured-output call with model ${String(msg.model ?? 'unknown')}, attempts: ${String(msg.attempts)}, output error: ${String(msg.outputError)}.`)
      out.push('')
    } else if (type === 'assistant' || type === 'user') {
      const inner = msg.message as { content?: unknown } | undefined
      const content = inner && Array.isArray(inner.content) ? (inner.content as ContentBlock[]) : []
      if (type === 'assistant') {
        turn += 1
        out.push(`## Turn ${turn}`)
        out.push('')
      }
      blockLines(content, out)
      if (type === 'assistant') out.push('')
    } else if (type === 'result') {
      out.push('## Result')
      out.push('')
      out.push(`- outcome: ${String(msg.subtype ?? 'unknown')}`)
      out.push(`- turns: ${String(msg.num_turns ?? 'n/a')}, wall time: ${String(msg.duration_ms ?? 'n/a')}ms, cost estimate: $${String(msg.total_cost_usd ?? 'n/a')}`)
      const denials = msg.permission_denials as unknown[] | undefined
      out.push(`- permission denials recorded: ${Array.isArray(denials) ? denials.length : 0}`)
      out.push('')
    } else if (type === 'runner_error') {
      out.push(`Runner error: ${String(msg.error)}`)
      out.push('')
    }
  }
  return out.join('\n')
}

// Keeps the committed archive slim: screenshots are regenerable by the harness,
// and inline base64 screenshots inside trajectories are replaced by a stub
function slimArchivedCase(caseDir: string): void {
  for (const name of readdirSync(caseDir)) {
    if (name.endsWith('.png')) rmSync(join(caseDir, name), { force: true })
  }
  const jsonl = join(caseDir, 'trajectory.jsonl')
  if (!existsSync(jsonl)) return
  const slimmed = readFileSync(jsonl, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      if (line.length < 20000) return line
      try {
        const msg = JSON.parse(line) as Record<string, unknown>
        const stripped = JSON.parse(
          JSON.stringify(msg, (key, value) =>
            key === 'data' && typeof value === 'string' && value.length > 10000
              ? `[base64 image omitted, ${value.length} bytes, regenerable from the archived workdir]`
              : value
          )
        )
        return JSON.stringify(stripped)
      } catch {
        return line
      }
    })
    .join('\n')
  writeFileSync(jsonl, slimmed + '\n')
}

async function main(): Promise<void> {
  const { positionals } = parseArgs({ allowPositionals: true })
  const runName = positionals[0]
  if (!runName) {
    console.error('usage: npm run promote -- <run-name-under-runs/> [archive-name]')
    process.exitCode = 1
    return
  }
  const runRoot = join(runsDir, runName)
  if (!existsSync(join(runRoot, 'results.json'))) {
    console.error(`${runRoot} has no results.json, score it first`)
    process.exitCode = 1
    return
  }
  const archiveName = positionals[1] ?? roleFor(runName)
  if (!archiveName) {
    console.error(`cannot infer a role (before, baseline, agent) from run name ${runName}, pass an explicit archive name`)
    process.exitCode = 1
    return
  }
  if (!/^(before|baseline|agent|sonnet|ablation)/.test(archiveName)) {
    console.error(`archive name must start with before, baseline, agent, sonnet or ablation, got ${archiveName}`)
    process.exitCode = 1
    return
  }
  const dest = join(archiveDir, archiveName)
  rmSync(dest, { recursive: true, force: true })
  copyDir(runRoot, dest)
  for (const entry of readdirSync(dest, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    slimArchivedCase(join(dest, entry.name))
    const jsonl = join(dest, entry.name, 'trajectory.jsonl')
    if (existsSync(jsonl)) {
      writeFileSync(join(dest, entry.name, 'trajectory.md'), renderTrajectoryMd(jsonl, entry.name) + '\n')
    }
  }
  console.log(`promoted runs/${runName} to runs-archive/${archiveName}`)
  console.log('re-render the archived comparison with: npm run report -- --archive')
}

if (isMain(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}
