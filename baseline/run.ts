import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { parseArgs } from 'node:util'
import { closeBrowser } from '../harness/browser.ts'
import { scoreRun } from '../harness/score.ts'
import {
  filterCases, fixturesDir, gitCommit, isMain, listCaseIds, loadEnv, repoRoot, runsDir, timestamp, writeJson
} from '../harness/util.ts'

// One direct prompt with the same model, contract and fixture files as the agent.
// The single deliberate difference is that it gets no tools and no iteration
const FixedFiles = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() }))
})

const PRICES_PER_MTOK: Record<string, { input: number, output: number }> = {
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-haiku-4-5': { input: 1, output: 5 }
}

function fixtureFiles(caseId: string): Array<{ name: string, content: string }> {
  const dir = join(fixturesDir, caseId)
  return readdirSync(dir)
    .filter(name => name !== 'case.json')
    .sort()
    .map(name => ({ name, content: readFileSync(join(dir, name), 'utf8') }))
}

function safeRelative(path: string): string | null {
  const clean = normalize(path).replace(/^\/+/, '')
  if (clean.startsWith('..') || clean.includes('../') || clean.includes('..\\')) return null
  return clean
}

async function runCase(
  client: Anthropic,
  model: string,
  caseId: string,
  caseDir: string,
  contract: string
): Promise<void> {
  const workdir = join(caseDir, 'workdir')
  mkdirSync(workdir, { recursive: true })
  const files = fixtureFiles(caseId)
  const userContent = files
    .map(file => `=== FILE: ${file.name} ===\n${file.content}`)
    .join('\n\n')
  const system = [
    contract,
    '## Output',
    'Return every file that needs changes with its complete updated content.',
    'Files you do not return stay unchanged. Use the same relative paths you were given.'
  ].join('\n\n')

  const started = Date.now()
  let parsed: z.infer<typeof FixedFiles> | null = null
  let outputError = false
  let failReason: string | undefined
  let costUsd: number | undefined
  let attempts = 0
  while (attempts < 2 && parsed === null) {
    attempts += 1
    try {
      const res = await client.messages.parse({
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: 'user', content: userContent }],
        output_config: { format: zodOutputFormat(FixedFiles) }
      })
      const price = PRICES_PER_MTOK[model]
      if (price && res.usage) {
        const add =
          (res.usage.input_tokens / 1e6) * price.input +
          (res.usage.output_tokens / 1e6) * price.output
        costUsd = (costUsd ?? 0) + add
      }
      parsed = res.parsed_output ?? null
      if (parsed === null) failReason = 'outputError'
    } catch (err) {
      failReason = `api_error: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`
    }
  }

  // Start from the unchanged fixture, then lay the model's files on top.
  // On total failure the case scores as untreated instead of as an empty page
  for (const file of files) writeFileSync(join(workdir, file.name), file.content)
  if (parsed === null) {
    outputError = true
  } else {
    for (const out of parsed.files) {
      const rel = safeRelative(out.path)
      if (rel === null) continue
      writeFileSync(join(workdir, rel), out.content)
    }
  }
  writeJson(join(caseDir, 'runner.json'), {
    costUsd: costUsd === undefined ? undefined : Number(costUsd.toFixed(4)),
    wallMs: Date.now() - started,
    outputError,
    failReason
  })
  writeFileSync(
    join(caseDir, 'trajectory.jsonl'),
    JSON.stringify({ type: 'baseline_single_call', model, attempts, outputError, failReason: failReason ?? null }) + '\n'
  )
}

async function main(): Promise<void> {
  loadEnv()
  const { values } = parseArgs({
    options: { case: { type: 'string', multiple: true } },
    allowPositionals: true
  })
  const model = process.env.MODEL ?? 'claude-sonnet-5'
  const runName = `baseline-${timestamp()}`
  const runRoot = join(runsDir, runName)
  const caseIds = filterCases(listCaseIds(), values.case)
  const contract = readFileSync(join(repoRoot, 'TASK_CONTRACT.md'), 'utf8')
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID
  const client = new Anthropic(
    workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {}
  )

  writeJson(join(runRoot, 'meta.json'), {
    kind: 'baseline',
    model,
    createdAt: new Date().toISOString(),
    node: process.version,
    gitCommit: gitCommit(),
    note: 'one direct structured-output call per case, no tools, no iteration'
  })

  for (const caseId of caseIds) {
    console.log(`baseline: ${caseId} (${model})`)
    await runCase(client, model, caseId, join(runRoot, caseId), contract)
  }
  try {
    const results = await scoreRun(runRoot, runName, caseIds)
    console.log(`\nbaseline scored: ${results.passRate} pass, see runs/${runName}/results.md`)
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
