import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import type { Page } from 'playwright'

export async function screenshotViewport(page: Page, outPath: string): Promise<void> {
  await page.screenshot({ path: outPath, fullPage: false })
}

// Returns the fraction of changed pixels, or 1 when dimensions differ.
// Recorded as evidence only, contrast fixes are allowed to change pixels
export function diffPngs(aPath: string, bPath: string, outPath: string): number {
  const a = PNG.sync.read(readFileSync(aPath))
  const b = PNG.sync.read(readFileSync(bPath))
  if (a.width !== b.width || a.height !== b.height) return 1
  const out = new PNG({ width: a.width, height: a.height })
  const changed = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0.1 })
  writeFileSync(outPath, PNG.sync.write(out))
  return Number((changed / (a.width * a.height)).toFixed(4))
}
