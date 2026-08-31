export type ActivationKey = 'enter' | 'space'

export type InteractiveSpec = {
  track: string
  keys: ActivationKey[]
}

export type CaseSpec = {
  id: string
  name: string
  seeded: string[]
  interactive: InteractiveSpec[]
  probe?: 'modalTrap' | 'dropdownKeyboard'
  notes?: string
}

export type AxeSummary = {
  violations: number
  incomplete: number
  rules: Array<{ id: string, impact: string, nodes: number, help: string, targets: string[] }>
}

export type ElementGeom = {
  key: string
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}

export type PageGeom = {
  elements: ElementGeom[]
  scrollWidth: number
  scrollHeight: number
  viewportWidth: number
}

export type LayoutCompare = {
  pass: boolean
  missing: string[]
  shrunken: string[]
  overflowX: boolean
  heightRatio: number
}

export type KeyboardCheck = {
  pass: boolean
  tabOrder: string[]
  unreachable: string[]
  orderPass: boolean
  activationFailures: Array<{ track: string, key: string }>
  focusIndicatorFailures: string[]
  probe?: { name: string, pass: boolean, detail: string }
}

export type CaseScore = {
  caseId: string
  name: string
  gates: { axe: boolean, keyboard: boolean, layout: boolean }
  pass: boolean
  axeBefore: number
  axeAfter: number
  incompleteAfter: number
  axeRules: AxeSummary['rules']
  keyboard: KeyboardCheck
  layout: LayoutCompare
  pixelDiffRatio: number | null
  failReason?: string
  costUsd?: number
  turns?: number
  wallMs?: number
  cacheReadTokens?: number
  permissionDenials?: number
  outputError?: boolean
}

export type RunResults = {
  runName: string
  createdAt: string
  cases: CaseScore[]
  passRate: string
  meta?: Record<string, unknown>
}
