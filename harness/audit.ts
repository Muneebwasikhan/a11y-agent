import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from 'playwright'
import type { AxeSummary } from './types.ts'

// Tag set includes best-practice on purpose: heading-order, region,
// page-has-heading-one and the positive-tabindex rule live there, not under wcag tags
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

export async function runAxe(page: Page): Promise<AxeSummary> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const countNodes = (list: typeof results.violations) =>
    list.reduce((n, rule) => n + rule.nodes.length, 0)
  return {
    violations: countNodes(results.violations),
    incomplete: countNodes(results.incomplete),
    rules: results.violations.map(rule => ({
      id: rule.id,
      impact: rule.impact ?? 'unknown',
      nodes: rule.nodes.length,
      help: rule.help,
      targets: rule.nodes.slice(0, 5).map(node => node.target.join(' '))
    }))
  }
}
