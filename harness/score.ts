import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { closeBrowser, newPage, preparePage } from './browser.ts'
import { runAxe } from './audit.ts'
import { captureGeometry, compareLayout } from './layout.ts'
import { checkKeyboard } from './keyboard.ts'
import { diffPngs, screenshotViewport } from './screenshot.ts'
import { serveDir } from './serve.ts'
import {
  archiveDir, copyDir, filterCases, fixturesDir, isMain, listCaseIds, readJson, runsDir, timestamp, writeJson
} from './util.ts'
import type { CaseScore, CaseSpec, RunResults } from './types.ts'

type RunnerInfo = Partial<Pick<CaseScore,
  'costUsd' | 'turns' | 'wallMs' | 'cacheReadTokens' | 'permissionDenials' | 'outputError' | 'failReason'
>>

export function loadSpec(caseId: string): CaseSpec {
  const spec = readJson<Omit<CaseSpec, 'id'>>(join(fixturesDir, caseId, 'case.json'))
  return { id: caseId, ...spec }
}

// Scores one case working copy against the pristine fixture.
// Everything here is local Playwright, no API is involved anywhere
export async function scoreCase(caseId: string, workdir: string, artifactsDir: string): Promise<CaseScore> {
  const spec = loadSpec(caseId)
  const fixtureServer = await serveDir(join(fixturesDir, caseId))
  const workServer = await serveDir(workdir)
  const { context, page } = await newPage()
  mkdirSync(artifactsDir, { recursive: true })
  try {
    await preparePage(page, fixtureServer.url)
    const geomBefore = await captureGeometry(page)
    const axeBefore = await runAxe(page)
    const beforePng = join(artifactsDir, 'before.png')
    await screenshotViewport(page, beforePng)

    await preparePage(page, workServer.url)
    const geomAfter = await captureGeometry(page)
    const axeAfter = await runAxe(page)
    const afterPng = join(artifactsDir, 'after.png')
    await screenshotViewport(page, afterPng)

    const pixelDiffRatio = diffPngs(beforePng, afterPng, join(artifactsDir, 'diff.png'))
    const layout = compareLayout(geomBefore, geomAfter)
    const keyboard = await checkKeyboard(page, workServer.url, spec)

    const gates = {
      axe: axeAfter.violations === 0,
      keyboard: keyboard.pass,
      layout: layout.pass
    }
    const score: CaseScore = {
      caseId,
      name: spec.name,
      gates,
      pass: gates.axe && gates.keyboard && gates.layout,
      axeBefore: axeBefore.violations,
      axeAfter: axeAfter.violations,
      incompleteAfter: axeAfter.incomplete,
      axeRules: axeAfter.rules,
      keyboard,
      layout,
      pixelDiffRatio
    }
    const runnerPath = join(artifactsDir, 'runner.json')
    if (existsSync(runnerPath)) Object.assign(score, readJson<RunnerInfo>(runnerPath))
    writeJson(join(artifactsDir, 'score.json'), score)
    return score
  } finally {
    await context.close()
    await fixtureServer.close()
    await workServer.close()
  }
}

function mark(ok: boolean): string {
  return ok ? 'pass' : 'FAIL'
}

export function renderResultsMd(results: RunResults): string {
  const lines: string[] = []
  lines.push(`# Results: ${results.runName}`)
  lines.push('')
  lines.push(`Generated ${results.createdAt}. Composite pass rate: **${results.passRate}**.`)
  lines.push('')
  lines.push('| Case | Axe before | Axe after | Keyboard | Layout | Pixel diff | Pass | Cost USD | Turns |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const c of results.cases) {
    const pixel = c.pixelDiffRatio === null ? 'n/a' : `${(c.pixelDiffRatio * 100).toFixed(1)}%`
    const cost = c.costUsd === undefined ? '' : c.costUsd.toFixed(3)
    const turns = c.turns === undefined ? '' : String(c.turns)
    lines.push(
      `| ${c.caseId} | ${c.axeBefore} | ${c.axeAfter} | ${mark(c.gates.keyboard)} | ${mark(c.gates.layout)} | ${pixel} | ${mark(c.pass)} | ${cost} | ${turns} |`
    )
  }
  lines.push('')
  const failures = results.cases.filter(c => !c.pass)
  if (failures.length > 0) {
    lines.push('## Failure detail')
    lines.push('')
    for (const c of failures) {
      const notes: string[] = []
      if (!c.gates.axe) notes.push(`${c.axeAfter} axe violations (${c.axeRules.map(r => r.id).join(', ')})`)
      if (!c.gates.keyboard) {
        if (c.keyboard.unreachable.length > 0) notes.push(`unreachable: ${c.keyboard.unreachable.join(', ')}`)
        if (!c.keyboard.orderPass) notes.push('tab order differs from the expected visual order')
        if (c.keyboard.activationFailures.length > 0) {
          notes.push(`activation failures: ${c.keyboard.activationFailures.map(f => `${f.track}(${f.key})`).join(', ')}`)
        }
        if (c.keyboard.focusIndicatorFailures.length > 0) {
          notes.push(`no focus indicator: ${c.keyboard.focusIndicatorFailures.join(', ')}`)
        }
        if (c.keyboard.probe && !c.keyboard.probe.pass) notes.push(`${c.keyboard.probe.name}: ${c.keyboard.probe.detail}`)
      }
      if (!c.gates.layout) {
        if (c.layout.missing.length > 0) notes.push(`missing elements: ${c.layout.missing.join(', ')}`)
        if (c.layout.shrunken.length > 0) notes.push(`shrunken elements: ${c.layout.shrunken.join(', ')}`)
        if (c.layout.overflowX) notes.push('horizontal overflow introduced')
      }
      if (c.failReason) notes.push(`runner: ${c.failReason}`)
      lines.push(`- **${c.caseId}**: ${notes.join(', ') || 'see score.json'}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

export async function scoreRun(runRoot: string, runName: string, caseIds: string[]): Promise<RunResults> {
  const cases: CaseScore[] = []
  for (const caseId of caseIds) {
    const caseDir = join(runRoot, caseId)
    const workdir = join(caseDir, 'workdir')
    if (!existsSync(workdir)) {
      console.log(`skip ${caseId}: no workdir in ${runRoot}`)
      continue
    }
    process.stdout.write(`scoring ${caseId} ... `)
    const score = await scoreCase(caseId, workdir, caseDir)
    console.log(score.pass ? 'pass' : 'FAIL')
    cases.push(score)
  }
  const passed = cases.filter(c => c.pass).length
  const results: RunResults = {
    runName,
    createdAt: new Date().toISOString(),
    cases,
    passRate: `${passed}/${cases.length}`
  }
  const metaPath = join(runRoot, 'meta.json')
  if (existsSync(metaPath)) results.meta = readJson<Record<string, unknown>>(metaPath)
  writeJson(join(runRoot, 'results.json'), results)
  writeFileSync(join(runRoot, 'results.md'), renderResultsMd(results) + '\n')
  return results
}

function prepareBeforeRun(caseIds: string[]): string {
  const runRoot = join(runsDir, 'before')
  for (const caseId of caseIds) {
    copyDir(join(fixturesDir, caseId), join(runRoot, caseId, 'workdir'))
  }
  writeJson(join(runRoot, 'meta.json'), {
    kind: 'before',
    createdAt: new Date().toISOString(),
    note: 'pristine fixtures copied unchanged, this is the untreated starting point'
  })
  return runRoot
}

type VerifyOutcome = { role: string, caseId: string, ok: boolean, detail: string }

async function verifyArchive(caseFilter: string[] | undefined): Promise<boolean> {
  if (!existsSync(archiveDir)) {
    console.error('runs-archive/ does not exist yet, promote a run first with: npm run promote -- <run-name>')
    return false
  }
  const roles = readdirSync(archiveDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
  const outcomes: VerifyOutcome[] = []
  for (const role of roles) {
    const archivedRoot = join(archiveDir, role)
    const resultsPath = join(archivedRoot, 'results.json')
    if (!existsSync(resultsPath)) continue
    const archived = readJson<RunResults>(resultsPath)
    const verifyRoot = join(runsDir, `verify-${role}-${timestamp()}`)
    const ids = filterCases(archived.cases.map(c => c.caseId), caseFilter)
    console.log(`\nre-scoring runs-archive/${role} into ${verifyRoot}`)
    for (const caseId of ids) {
      copyDir(join(archivedRoot, caseId, 'workdir'), join(verifyRoot, caseId, 'workdir'))
    }
    const fresh = await scoreRun(verifyRoot, `verify-${role}`, ids)
    for (const freshCase of fresh.cases) {
      const archivedCase = archived.cases.find(c => c.caseId === freshCase.caseId)
      if (!archivedCase) {
        outcomes.push({ role, caseId: freshCase.caseId, ok: false, detail: 'case missing from archived results' })
        continue
      }
      const same =
        archivedCase.pass === freshCase.pass &&
        archivedCase.gates.axe === freshCase.gates.axe &&
        archivedCase.gates.keyboard === freshCase.gates.keyboard &&
        archivedCase.gates.layout === freshCase.gates.layout &&
        archivedCase.axeBefore === freshCase.axeBefore &&
        archivedCase.axeAfter === freshCase.axeAfter
      const detail = same
        ? `pass=${freshCase.pass} axe ${freshCase.axeBefore}->${freshCase.axeAfter}`
        : `archived pass=${archivedCase.pass} axe ${archivedCase.axeBefore}->${archivedCase.axeAfter}, recomputed pass=${freshCase.pass} axe ${freshCase.axeBefore}->${freshCase.axeAfter}`
      outcomes.push({ role, caseId: freshCase.caseId, ok: same, detail })
    }
  }
  console.log('\nverification against committed results:')
  let allOk = true
  for (const o of outcomes) {
    console.log(`  ${o.ok ? 'MATCH   ' : 'MISMATCH'} ${o.role}/${o.caseId}  ${o.detail}`)
    if (!o.ok) allOk = false
  }
  if (outcomes.length === 0) {
    console.log('  nothing to verify, the archive has no results.json files')
    return false
  }
  console.log(allOk
    ? '\nall archived results reproduced on this machine'
    : '\nsome archived results did NOT reproduce, see mismatches above')
  return allOk
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      target: { type: 'string' },
      case: { type: 'string', multiple: true }
    },
    allowPositionals: true
  })
  const target = values.target
  if (!target) {
    console.error('usage: tsx harness/score.ts --target <before|archive|run-name> [--case NN]')
    process.exitCode = 1
    return
  }
  try {
    if (target === 'archive') {
      const ok = await verifyArchive(values.case)
      if (!ok) process.exitCode = 1
      return
    }
    const caseIds = filterCases(listCaseIds(), values.case)
    if (target === 'before') {
      const runRoot = prepareBeforeRun(caseIds)
      const results = await scoreRun(runRoot, 'before', caseIds)
      console.log(`\nbefore run scored: ${results.passRate} pass, results in runs/before/results.md`)
      return
    }
    const runRoot = join(runsDir, target)
    if (!existsSync(runRoot)) {
      console.error(`run directory not found: ${runRoot}`)
      process.exitCode = 1
      return
    }
    const present = filterCases(caseIds, undefined).filter(id => existsSync(join(runRoot, id, 'workdir')))
    const results = await scoreRun(runRoot, target, present)
    console.log(`\nscored ${target}: ${results.passRate} pass`)
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
