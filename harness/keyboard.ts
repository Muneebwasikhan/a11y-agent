import type { Page } from 'playwright'
import { preparePage } from './browser.ts'
import type { CaseSpec, KeyboardCheck } from './types.ts'

const STYLE_FIELDS = 'outlineStyle outlineWidth outlineColor boxShadow backgroundColor borderTopColor'

// The uid disambiguates elements that share a semantic key, two bare inputs
// would otherwise look identical to the cycle detector
async function activeElementInfo(page: Page): Promise<{ uid: number, key: string } | null> {
  return page.evaluate(() => {
    const el = document.activeElement as (HTMLElement & { __tabUid?: number }) | null
    if (!el || el === document.body || el === document.documentElement) return null
    const w = window as unknown as { __tabUidCounter?: number }
    if (el.__tabUid === undefined) {
      w.__tabUidCounter = (w.__tabUidCounter ?? 0) + 1
      el.__tabUid = w.__tabUidCounter
    }
    let key = `tag:${el.tagName.toLowerCase()}`
    if (el.id) key = `id:${el.id}`
    if (el.dataset && el.dataset.track) key = `track:${el.dataset.track}`
    return { uid: el.__tabUid, key }
  })
}

async function activeElementStyleSnap(page: Page): Promise<string | null> {
  return page.evaluate(fields => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return null
    const style = window.getComputedStyle(el) as unknown as Record<string, string>
    return fields.split(' ').map(f => style[f]).join('|')
  }, STYLE_FIELDS)
}

async function trackStyleSnap(page: Page, track: string): Promise<string | null> {
  return page.evaluate(
    args => {
      const el = document.querySelector(`[data-track="${args.track}"]`) as HTMLElement | null
      if (!el) return null
      const style = window.getComputedStyle(el) as unknown as Record<string, string>
      return args.fields.split(' ').map(f => style[f]).join('|')
    },
    { track, fields: STYLE_FIELDS }
  )
}

async function resetActivations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __activated?: string[] }
    w.__activated = []
  })
}

async function activationsInclude(page: Page, matcher: string): Promise<boolean> {
  return page.evaluate(prefix => {
    const w = window as unknown as { __activated?: string[] }
    const list = Array.isArray(w.__activated) ? w.__activated : []
    return list.some(entry => entry === prefix || entry.startsWith(prefix))
  }, matcher)
}

async function focusTrack(page: Page, track: string): Promise<boolean> {
  return page.evaluate(t => {
    const el = document.querySelector(`[data-track="${t}"]`) as HTMLElement | null
    if (!el) return false
    el.focus()
    return document.activeElement === el
  }, track)
}

async function isVisible(page: Page, selector: string): Promise<boolean> {
  return page.evaluate(sel => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }, selector)
}

export type TabObservation = {
  tabOrder: string[]
  focusedSnaps: Map<string, string | null>
}

export async function observeTabOrder(page: Page, maxPresses = 40): Promise<TabObservation> {
  const tabOrder: string[] = []
  const focusedSnaps = new Map<string, string | null>()
  let firstUid: number | null = null
  let presses = 0
  while (presses < maxPresses) {
    presses += 1
    await page.keyboard.press('Tab')
    const info = await activeElementInfo(page)
    if (info === null) continue
    if (firstUid === null) firstUid = info.uid
    else if (info.uid === firstUid) break
    tabOrder.push(info.key)
    if (info.key.startsWith('track:') && !focusedSnaps.has(info.key)) {
      focusedSnaps.set(info.key, await activeElementStyleSnap(page))
    }
  }
  return { tabOrder, focusedSnaps }
}

async function probeModalTrap(page: Page, nav: () => Promise<void>): Promise<{ pass: boolean, detail: string }> {
  await nav()
  const problems: string[] = []
  const focused = await focusTrack(page, 'open-modal')
  if (!focused) return { pass: false, detail: 'opener [data-track=open-modal] is not focusable' }
  await page.keyboard.press('Enter')
  const opened = await isVisible(page, '[data-modal-root]')
  if (!opened) return { pass: false, detail: 'Enter on the opener did not open [data-modal-root]' }
  let contained = true
  let tabs = 0
  while (tabs < 8) {
    tabs += 1
    await page.keyboard.press('Tab')
    const inside = await page.evaluate(() => {
      const root = document.querySelector('[data-modal-root]')
      const el = document.activeElement
      return Boolean(root && el && root.contains(el))
    })
    if (!inside) {
      contained = false
      break
    }
  }
  if (!contained) problems.push('focus escapes the open modal while tabbing')
  await page.keyboard.press('Escape')
  const closed = !(await isVisible(page, '[data-modal-root]'))
  if (!closed) problems.push('Escape does not close the modal')
  if (closed) {
    const returned = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return Boolean(el && el.dataset && el.dataset.track === 'open-modal')
    })
    if (!returned) problems.push('focus does not return to the opener after close')
  }
  const pass = problems.length === 0
  return { pass, detail: pass ? 'trap, escape and focus return all work' : problems.join(', ') }
}

async function probeDropdownKeyboard(page: Page, nav: () => Promise<void>): Promise<{ pass: boolean, detail: string }> {
  await nav()
  await resetActivations(page)
  const focused = await focusTrack(page, 'dd-toggle')
  if (!focused) return { pass: false, detail: 'toggle [data-track=dd-toggle] is not focusable' }
  await page.keyboard.press('Enter')
  const opened = await isVisible(page, '[data-dd-list]')
  if (!opened) return { pass: false, detail: 'Enter on the toggle did not open [data-dd-list]' }
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  const selected = await activationsInclude(page, 'dd-option')
  if (!selected) return { pass: false, detail: 'arrow keys plus Enter did not select an option' }
  const closedAfter = !(await isVisible(page, '[data-dd-list]'))
  if (!closedAfter) return { pass: false, detail: 'list stays open after keyboard selection' }
  return { pass: true, detail: 'open, arrow navigation, select and close all work from the keyboard' }
}

export async function checkKeyboard(page: Page, url: string, spec: CaseSpec): Promise<KeyboardCheck> {
  const nav = () => preparePage(page, url)

  await nav()
  const { tabOrder, focusedSnaps } = await observeTabOrder(page)
  const reached = new Set(tabOrder)
  const unreachable = spec.interactive
    .filter(item => !reached.has(`track:${item.track}`))
    .map(item => item.track)

  const specTracks = spec.interactive.map(item => item.track)
  const reachedSpecOrder: string[] = []
  for (const key of tabOrder) {
    if (!key.startsWith('track:')) continue
    const track = key.slice('track:'.length)
    if (specTracks.includes(track) && !reachedSpecOrder.includes(track)) reachedSpecOrder.push(track)
  }
  const expectedOrder = specTracks.filter(track => reachedSpecOrder.includes(track))
  const orderPass = JSON.stringify(reachedSpecOrder) === JSON.stringify(expectedOrder)

  // Fresh unfocused page, then compare computed styles against the focused snapshots
  await nav()
  const focusIndicatorFailures: string[] = []
  for (const item of spec.interactive) {
    const key = `track:${item.track}`
    if (!focusedSnaps.has(key)) continue
    const unfocused = await trackStyleSnap(page, item.track)
    const focusedSnap = focusedSnaps.get(key) ?? null
    if (unfocused !== null && focusedSnap !== null && unfocused === focusedSnap) {
      focusIndicatorFailures.push(item.track)
    }
  }

  // One clean page per activation probe so state mutations never leak between probes
  const activationFailures: Array<{ track: string, key: string }> = []
  for (const item of spec.interactive) {
    for (const key of item.keys) {
      await nav()
      await resetActivations(page)
      const focused = await focusTrack(page, item.track)
      if (focused) await page.keyboard.press(key === 'enter' ? 'Enter' : 'Space')
      const activated = focused && (await activationsInclude(page, item.track))
      if (!activated) activationFailures.push({ track: item.track, key })
    }
  }

  let probe: KeyboardCheck['probe']
  if (spec.probe === 'modalTrap') {
    const result = await probeModalTrap(page, nav)
    probe = { name: 'modalTrap', ...result }
  } else if (spec.probe === 'dropdownKeyboard') {
    const result = await probeDropdownKeyboard(page, nav)
    probe = { name: 'dropdownKeyboard', ...result }
  }

  const pass =
    unreachable.length === 0 &&
    orderPass &&
    activationFailures.length === 0 &&
    focusIndicatorFailures.length === 0 &&
    (probe ? probe.pass : true)

  return { pass, tabOrder, unreachable, orderPass, activationFailures, focusIndicatorFailures, probe }
}

// Spec-free observation for the agent tool: reports what IS, never what is expected
export type KeyboardObservation = {
  tabOrder: string[]
  tracksInDom: string[]
  unreachableTracks: string[]
  activation: Array<{ track: string, key: string, activated: boolean }>
  noFocusIndicator: string[]
}

export async function observeKeyboard(page: Page, url: string): Promise<KeyboardObservation> {
  const nav = () => preparePage(page, url)
  await nav()
  const tracksInDom: string[] = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-track]'))
    return nodes.map(node => (node as HTMLElement).dataset.track ?? '').filter(Boolean)
  })
  const { tabOrder, focusedSnaps } = await observeTabOrder(page)
  const reached = new Set(tabOrder)
  const unreachableTracks = tracksInDom.filter(track => !reached.has(`track:${track}`))

  await nav()
  const noFocusIndicator: string[] = []
  for (const track of tracksInDom) {
    const key = `track:${track}`
    if (!focusedSnaps.has(key)) continue
    const unfocused = await trackStyleSnap(page, track)
    const focusedSnap = focusedSnaps.get(key) ?? null
    if (unfocused !== null && focusedSnap !== null && unfocused === focusedSnap) noFocusIndicator.push(track)
  }

  const activation: KeyboardObservation['activation'] = []
  for (const track of tracksInDom) {
    for (const key of ['enter', 'space'] as const) {
      await nav()
      await resetActivations(page)
      const focused = await focusTrack(page, track)
      if (focused) await page.keyboard.press(key === 'enter' ? 'Enter' : 'Space')
      const activated = focused && (await activationsInclude(page, track))
      activation.push({ track, key, activated })
    }
  }
  return { tabOrder, tracksInDom, unreachableTracks, activation, noFocusIndicator }
}
