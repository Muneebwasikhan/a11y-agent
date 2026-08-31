import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

let browserPromise: Promise<Browser> | null = null

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) browserPromise = chromium.launch()
  return browserPromise
}

export async function newPage(): Promise<{ context: BrowserContext, page: Page }> {
  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()
  return { context, page }
}

// Deterministic load: full load event, fonts settled, animations and caret disabled
export async function preparePage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.addStyleTag({
    content: '*{animation:none!important;transition:none!important;caret-color:transparent!important}'
  })
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return
  const browser = await browserPromise
  browserPromise = null
  await browser.close()
}
