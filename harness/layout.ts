import type { Page } from 'playwright'
import type { ElementGeom, LayoutCompare, PageGeom } from './types.ts'

export async function captureGeometry(page: Page): Promise<PageGeom> {
  return page.evaluate(() => {
    const seen = new Set<string>()
    const elements: Array<{
      key: string, x: number, y: number, width: number, height: number, visible: boolean
    }> = []
    const nodes = Array.from(document.querySelectorAll('[data-track], [id]'))
    for (const node of nodes) {
      const el = node as HTMLElement
      const track = el.dataset ? el.dataset.track : undefined
      const key = track ? `track:${track}` : `id:${el.id}`
      if (seen.has(key)) continue
      seen.add(key)
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      elements.push({ key, x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible })
    }
    const scroller = document.scrollingElement ?? document.documentElement
    return {
      elements,
      scrollWidth: scroller.scrollWidth,
      scrollHeight: scroller.scrollHeight,
      viewportWidth: window.innerWidth
    }
  })
}

// Matched by data-track or id, never by tag or position, so a div rebuilt
// as a button still counts as the same element
export function compareLayout(before: PageGeom, after: PageGeom): LayoutCompare {
  const afterMap = new Map<string, ElementGeom>(after.elements.map(el => [el.key, el]))
  const missing: string[] = []
  const shrunken: string[] = []
  for (const el of before.elements) {
    if (!el.visible) continue
    const now = afterMap.get(el.key)
    if (!now || !now.visible) {
      missing.push(el.key)
      continue
    }
    const areaBefore = el.width * el.height
    const areaAfter = now.width * now.height
    if (areaBefore > 0 && areaAfter < areaBefore * 0.5) shrunken.push(el.key)
  }
  const overflowX = after.scrollWidth > after.viewportWidth + 2
  const heightRatio = after.scrollHeight / Math.max(1, before.scrollHeight)
  const pass =
    missing.length === 0 &&
    shrunken.length === 0 &&
    !overflowX &&
    heightRatio >= 0.7 &&
    heightRatio <= 1.3
  return { pass, missing, shrunken, overflowX, heightRatio: Number(heightRatio.toFixed(3)) }
}
