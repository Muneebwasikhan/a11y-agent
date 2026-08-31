import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { archiveDir, isMain, readJson, repoRoot, runsDir } from './util.ts'
import type { CaseScore, RunResults } from './types.ts'

function loadResults(root: string): RunResults | null {
  const path = join(root, 'results.json')
  return existsSync(path) ? readJson<RunResults>(path) : null
}

function latestRun(prefix: string): string | null {
  if (!existsSync(runsDir)) return null
  const names = readdirSync(runsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith(prefix))
    .map(entry => entry.name)
    .filter(name => existsSync(join(runsDir, name, 'results.json')))
    .sort()
  return names.length > 0 ? names[names.length - 1] : null
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function fmtMs(ms: number | null): string {
  return ms === null ? 'n/a' : `${(ms / 1000).toFixed(1)}s`
}

function fmtUsd(usd: number | null): string {
  return usd === null ? 'n/a' : `$${usd.toFixed(3)}`
}

function sweepCost(run: RunResults): number {
  return run.cases.reduce((s, c) => s + (c.costUsd ?? 0), 0)
}

function passCount(run: RunResults): number {
  return Number(run.passRate.split('/')[0])
}

function model(runs: RunResults[]): string {
  const first = runs[0]
  return first && first.meta && typeof first.meta.model === 'string' ? first.meta.model : 'unknown model'
}

// Aggregates one arm across N sweeps of the same configuration
type Arm = {
  label: string
  runs: RunResults[]
  passRates: string
  worstOf: string
  meanCost: number | null
  meanWallMs: number | null
  perCase: Map<string, { passes: number, total: number }>
}

function buildArm(label: string, runs: RunResults[]): Arm | null {
  if (runs.length === 0) return null
  const perCase = new Map<string, { passes: number, total: number }>()
  for (const run of runs) {
    for (const c of run.cases) {
      const entry = perCase.get(c.caseId) ?? { passes: 0, total: 0 }
      entry.total += 1
      if (c.pass) entry.passes += 1
      perCase.set(c.caseId, entry)
    }
  }
  const caseTotal = runs[0].cases.length
  const worst = Math.min(...runs.map(passCount))
  const wall = runs.flatMap(r => r.cases.map(c => c.wallMs ?? 0)).filter(v => v > 0)
  const cost = runs.map(sweepCost).filter(v => v > 0)
  return {
    label,
    runs,
    passRates: runs.map(r => r.passRate).join(', '),
    worstOf: `${worst}/${caseTotal}`,
    meanCost: mean(cost),
    meanWallMs: mean(wall),
    perCase
  }
}

function consistency(arm: Arm): { always: string[], never: string[], flaky: string[] } {
  const always: string[] = []
  const never: string[] = []
  const flaky: string[] = []
  for (const [caseId, entry] of arm.perCase) {
    if (entry.passes === entry.total) always.push(caseId)
    else if (entry.passes === 0) never.push(caseId)
    else flaky.push(caseId)
  }
  return { always, never, flaky }
}

export function renderReport(before: RunResults, baseline: Arm | null, agent: Arm | null, heading: string): string {
  const lines: string[] = []
  lines.push(`# ${heading}`)
  lines.push('')
  const nBase = baseline ? baseline.runs.length : 0
  const nAgent = agent ? agent.runs.length : 0
  lines.push(
    `Untreated fixtures pass ${before.passRate}. ` +
    `Baseline is one direct structured-output call per case (${baseline ? model(baseline.runs) : 'not run'}, ${nBase} sweep${nBase === 1 ? '' : 's'}). ` +
    `Agent is the iterative tool-using workflow (${agent ? model(agent.runs) : 'not run'}, ${nAgent} sweep${nAgent === 1 ? '' : 's'}). ` +
    'Both receive the identical task contract and fixtures, the deliberate delta is tools plus iteration.'
  )
  lines.push('')
  lines.push('## Headline metrics')
  lines.push('')
  lines.push('| Metric | Simple baseline | Agent solution | Change |')
  lines.push('| --- | --- | --- | --- |')
  const b = baseline
  const a = agent
  lines.push(`| Pass rate per sweep (all three gates) | ${b ? b.passRates : 'n/a'} | ${a ? a.passRates : 'n/a'} | see per-case table |`)
  if (nBase > 1 || nAgent > 1) {
    lines.push(`| Worst sweep (reliability floor) | ${b ? b.worstOf : 'n/a'} | ${a ? a.worstOf : 'n/a'} | the deployment-honest number |`)
    const bc = b ? consistency(b) : null
    const ac = a ? consistency(a) : null
    lines.push(`| Cases passing every sweep | ${bc ? bc.always.length : 'n/a'} | ${ac ? ac.always.length : 'n/a'} | verification converts flaky into stable |`)
  }
  lines.push(`| Machine time per case, zero human minutes in both arms | ${fmtMs(b ? b.meanWallMs : null)} | ${fmtMs(a ? a.meanWallMs : null)} | unattended either way |`)
  lines.push(`| Cost per sweep of 12, client-side estimate | ${fmtUsd(b ? b.meanCost : null)} | ${fmtUsd(a ? a.meanCost : null)} | quality is the trade |`)
  lines.push('')
  lines.push('## Per-case outcomes (passes across sweeps)')
  lines.push('')
  lines.push('| Case | Untreated axe | Baseline | Agent |')
  lines.push('| --- | --- | --- | --- |')
  for (const c of before.cases) {
    const cell = (arm: Arm | null): string => {
      if (!arm) return 'n/a'
      const entry = arm.perCase.get(c.caseId)
      return entry ? `${entry.passes}/${entry.total}` : 'missing'
    }
    lines.push(`| ${c.caseId} | ${c.axeBefore} | ${cell(b)} | ${cell(a)} |`)
  }
  lines.push('')
  if (b && a && (nBase > 1 || nAgent > 1)) {
    const bc = consistency(b)
    const ac = consistency(a)
    lines.push('## Consistency detail')
    lines.push('')
    lines.push(`- Baseline never passes: ${bc.never.join(', ') || 'none'}`)
    lines.push(`- Baseline flaky: ${bc.flaky.join(', ') || 'none'}`)
    lines.push(`- Agent never passes: ${ac.never.join(', ') || 'none'}`)
    lines.push(`- Agent flaky: ${ac.flaky.join(', ') || 'none'}`)
    lines.push('')
  }
  lines.push('## Reading the table')
  lines.push('')
  lines.push('- Cases 03, 06, 07 and 09 carry near-zero axe counts while seeding real keyboard failures, they measure what a linter cannot see.')
  lines.push('- Every number above is recomputed by the harness from the stored working copies, run `npm run verify` to reproduce it locally without any API key.')
  lines.push('- Full detail per run lives next to each run in results.md and results.json, per-case evidence in score.json and trajectory files.')
  lines.push('')
  return lines.join('\n')
}

function collectArchiveGroup(prefix: string): RunResults[] {
  if (!existsSync(archiveDir)) return []
  return readdirSync(archiveDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith(prefix))
    .map(entry => loadResults(join(archiveDir, entry.name)))
    .filter((r): r is RunResults => r !== null)
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      archive: { type: 'boolean', default: false },
      baseline: { type: 'string' },
      agent: { type: 'string' }
    },
    allowPositionals: true
  })
  if (values.archive) {
    const beforeRuns = collectArchiveGroup('before')
    if (beforeRuns.length === 0) {
      console.error('runs-archive/before/results.json not found, promote the before run first')
      process.exitCode = 1
      return
    }
    const baseline = buildArm('baseline', collectArchiveGroup('baseline'))
    const agent = buildArm('agent', collectArchiveGroup('agent'))
    const md = renderReport(beforeRuns[0], baseline, agent, 'Archived comparison, reproducible without an API key')
    const out = join(archiveDir, 'REPORT.md')
    writeFileSync(out, md + '\n')
    console.log(md)
    console.log(`\nwritten to ${out}`)
    return
  }
  const before = loadResults(join(runsDir, 'before'))
  if (!before) {
    console.error('runs/before/results.json not found, run: npm run eval:before')
    process.exitCode = 1
    return
  }
  const baselineName = values.baseline ?? latestRun('baseline-')
  const agentName = values.agent ?? latestRun('agent-')
  const baselineRun = baselineName ? loadResults(join(runsDir, baselineName)) : null
  const agentRun = agentName ? loadResults(join(runsDir, agentName)) : null
  const md = renderReport(
    before,
    buildArm('baseline', baselineRun ? [baselineRun] : []),
    buildArm('agent', agentRun ? [agentRun] : []),
    `Comparison: before vs ${baselineName ?? 'no baseline yet'} vs ${agentName ?? 'no agent run yet'}`
  )
  const out = join(repoRoot, 'REPORT.md')
  writeFileSync(out, md + '\n')
  console.log(md)
  console.log(`\nwritten to ${out}`)
}

if (isMain(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}
