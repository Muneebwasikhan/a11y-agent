import { query } from '@anthropic-ai/claude-agent-sdk'
import { appendFileSync, copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { closeBrowser } from '../harness/browser.ts'
import { scoreRun } from '../harness/score.ts'
import {
  filterCases, fixturesDir, gitCommit, isMain, listCaseIds, loadEnv, repoRoot, runsDir, timestamp, writeJson
} from '../harness/util.ts'
import { ALL_TOOL_NAMES, makeA11yServer } from './tools.ts'

type VariantConfig = { mcpTools: string[], skill: boolean, memory: boolean }

const VARIANTS: Record<string, VariantConfig> = {
  'v1-notools': { mcpTools: [], skill: false, memory: false },
  'v2-audit': { mcpTools: ['audit_page'], skill: false, memory: false },
  'v3-verify': { mcpTools: ALL_TOOL_NAMES, skill: false, memory: false },
  'v4-skill': { mcpTools: ALL_TOOL_NAMES, skill: true, memory: false },
  'v5-memory': { mcpTools: ALL_TOOL_NAMES, skill: true, memory: true }
}

const CASE_TIMEOUT_MS = 20 * 60 * 1000
const TASK_PROMPT =
  'Audit and fix the accessibility of the web page in the current working directory so it satisfies the task contract. When you are confident it complies, stop and summarize what you changed and why.'

// Everything the agent must never read: harness internals, pristine fixtures
// with their case specs, the other runners, archived answers and credentials
const DENY_RULES = ['harness', 'fixtures', 'agent', 'baseline', 'runs-archive'].flatMap(dir => [
  `Read(//${repoRoot}/${dir}/**)`,
  `Grep(//${repoRoot}/${dir}/**)`,
  `Glob(//${repoRoot}/${dir}/**)`
]).concat([`Read(//${repoRoot}/.env)`, `Read(//${repoRoot}/**/.env)`])

function copyFixtureWithoutSpec(caseId: string, workdir: string): void {
  mkdirSync(workdir, { recursive: true })
  const dir = join(fixturesDir, caseId)
  for (const name of readdirSync(dir)) {
    if (name === 'case.json') continue
    copyFileSync(join(dir, name), join(workdir, name))
  }
}

function buildSystemPrompt(variant: VariantConfig, memoryPath: string | null): string {
  const parts = [readFileSync(join(repoRoot, 'agent', 'system-prompt.md'), 'utf8')]
  parts.push(readFileSync(join(repoRoot, 'TASK_CONTRACT.md'), 'utf8'))
  if (variant.skill) {
    parts.push(readFileSync(join(repoRoot, 'agent', 'skills', 'wcag-fix-patterns.md'), 'utf8'))
  }
  if (memoryPath) {
    parts.push(
      [
        '# Shared notes across cases',
        `A shared team notes file exists at ${memoryPath}. Read it before you start, earlier cases may have recorded lessons that apply here.`,
        'After finishing your fixes, append one short generalizable lesson about fixing this category of defect. Never record case-specific selectors or content, only reusable technique.'
      ].join('\n\n')
    )
  }
  return parts.join('\n\n')
}

type ResultCapture = {
  costUsd?: number
  turns?: number
  wallMs?: number
  cacheReadTokens?: number
  permissionDenials?: number
  failReason?: string
}

async function runCase(
  caseId: string,
  caseDir: string,
  variant: VariantConfig,
  model: string,
  systemPrompt: string,
  memoryDir: string | null
): Promise<void> {
  mkdirSync(caseDir, { recursive: true })
  let capture: ResultCapture = {}
  let attempts = 0
  while (attempts < 2) {
    attempts += 1
    capture = await attemptCase(caseId, caseDir, variant, model, systemPrompt, memoryDir)
    if (capture.failReason !== 'timeout') break
    if (attempts < 2) console.log('  case timed out on API retries, running it once more with a fresh working copy')
  }
  writeJson(join(caseDir, 'runner.json'), { ...capture, attempts })
}

async function attemptCase(
  caseId: string,
  caseDir: string,
  variant: VariantConfig,
  model: string,
  systemPrompt: string,
  memoryDir: string | null
): Promise<ResultCapture> {
  const workdir = join(caseDir, 'workdir')
  copyFixtureWithoutSpec(caseId, workdir)
  const trajPath = join(caseDir, 'trajectory.jsonl')
  writeFileSync(trajPath, '')
  const stderrPath = join(caseDir, 'stderr.log')
  writeFileSync(stderrPath, '')

  const capture: ResultCapture = {}
  const started = Date.now()
  const ac = new AbortController()
  const timer = setTimeout(() => {
    capture.failReason = 'timeout'
    ac.abort()
  }, CASE_TIMEOUT_MS)

  const useMcp = variant.mcpTools.length > 0
  const server = useMcp ? makeA11yServer(() => workdir) : null

  try {
    const q = query({
      prompt: TASK_PROMPT,
      options: {
        cwd: workdir,
        model,
        systemPrompt,
        settingSources: [],
        strictMcpConfig: true,
        tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
        disallowedTools: DENY_RULES,
        canUseTool: async (toolName: string) => ({
          behavior: 'deny' as const,
          message: `${toolName} is not permitted outside the case working copy. Work only within the current directory.`
        }),
        maxTurns: 40,
        maxBudgetUsd: 1.5,
        abortController: ac,
        stderr: (data: string) => appendFileSync(stderrPath, data),
        ...(server ? {
          mcpServers: { a11y: server },
          allowedTools: variant.mcpTools.map(name => `mcp__a11y__${name}`)
        } : {}),
        ...(memoryDir ? { additionalDirectories: [memoryDir] } : {})
      }
    })
    for await (const msg of q) {
      appendFileSync(trajPath, JSON.stringify(msg) + '\n')
      const m = msg as Record<string, unknown>
      if (m.type === 'result') {
        if (typeof m.total_cost_usd === 'number') capture.costUsd = Number(m.total_cost_usd.toFixed(4))
        if (typeof m.num_turns === 'number') capture.turns = m.num_turns
        if (typeof m.duration_ms === 'number') capture.wallMs = m.duration_ms
        const usage = m.usage as { cache_read_input_tokens?: number } | undefined
        if (usage && typeof usage.cache_read_input_tokens === 'number') {
          capture.cacheReadTokens = usage.cache_read_input_tokens
        }
        const denials = m.permission_denials as unknown[] | undefined
        if (Array.isArray(denials)) capture.permissionDenials = denials.length
        const subtype = typeof m.subtype === 'string' ? m.subtype : ''
        if (subtype === 'error_max_turns') capture.failReason = 'max_turns'
        if (subtype === 'error_max_budget_usd') capture.failReason = 'budget'
        if (subtype === 'error_during_execution' && !capture.failReason) capture.failReason = 'execution_error'
      }
    }
  } catch (err) {
    if (!capture.failReason) {
      capture.failReason = `error: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`
    }
    appendFileSync(trajPath, JSON.stringify({ type: 'runner_error', error: capture.failReason }) + '\n')
  } finally {
    clearTimeout(timer)
  }
  if (capture.wallMs === undefined) capture.wallMs = Date.now() - started
  return capture
}

async function main(): Promise<void> {
  loadEnv()
  if (process.env.AGENT_AUTH === 'login') {
    delete process.env.ANTHROPIC_API_KEY
    console.log('AGENT_AUTH=login set, ignoring the API key and using the local Claude Code login')
  }
  const { values } = parseArgs({
    options: {
      case: { type: 'string', multiple: true },
      variant: { type: 'string', default: 'v4-skill' }
    },
    allowPositionals: true
  })
  const variantName = values.variant === 'full' ? 'v4-skill' : values.variant ?? 'v4-skill'
  const variant = VARIANTS[variantName]
  if (!variant) {
    console.error(`unknown variant ${variantName}, expected one of: ${Object.keys(VARIANTS).join(', ')}`)
    process.exitCode = 1
    return
  }
  const model = process.env.MODEL ?? 'claude-sonnet-5'
  const runName = `agent-${variantName}-${timestamp()}`
  const runRoot = join(runsDir, runName)
  const caseIds = filterCases(listCaseIds(), values.case)

  let memoryDir: string | null = null
  let memoryPath: string | null = null
  if (variant.memory) {
    memoryDir = join(runRoot, 'memory')
    memoryPath = join(memoryDir, 'patterns.md')
    mkdirSync(memoryDir, { recursive: true })
    writeFileSync(memoryPath, '# Shared fix notes\n\nLessons appended by earlier cases in this run.\n')
  }
  const systemPrompt = buildSystemPrompt(variant, memoryPath)

  writeJson(join(runRoot, 'meta.json'), {
    kind: 'agent',
    variant: variantName,
    model,
    mcpTools: variant.mcpTools,
    skill: variant.skill,
    memory: variant.memory,
    createdAt: new Date().toISOString(),
    node: process.version,
    gitCommit: gitCommit(),
    sandbox: 'acceptEdits inside the case workdir, read denials on harness, fixtures, runners and archive, no Bash or network tools, no permission bypass'
  })

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('note: ANTHROPIC_API_KEY is not set, the SDK will fall back to an existing Claude Code login if one exists')
  }
  for (const caseId of caseIds) {
    console.log(`agent ${variantName}: ${caseId} (${model})`)
    await runCase(caseId, join(runRoot, caseId), variant, model, systemPrompt, memoryDir)
  }
  try {
    const results = await scoreRun(runRoot, runName, caseIds)
    console.log(`\nagent scored: ${results.passRate} pass, see runs/${runName}/results.md`)
  } finally {
    await closeBrowser()
  }
}

if (isMain(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}
