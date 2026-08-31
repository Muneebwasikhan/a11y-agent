import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const fixturesDir = join(repoRoot, 'fixtures')
export const runsDir = join(repoRoot, 'runs')
export const archiveDir = join(repoRoot, 'runs-archive')

export function isMain(importMetaUrl: string): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  return importMetaUrl === pathToFileURL(resolve(entry)).href
}

export function loadEnv(): void {
  const envPath = join(repoRoot, '.env')
  if (!existsSync(envPath)) return
  const loader = (process as unknown as { loadEnvFile?: (path: string) => void }).loadEnvFile
  if (typeof loader === 'function') {
    loader.call(process, envPath)
    return
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2]
  }
}

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export function listCaseIds(): string[] {
  return readdirSync(fixturesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
}

export function filterCases(all: string[], wanted: string[] | undefined): string[] {
  if (!wanted || wanted.length === 0) return all
  return all.filter(id => wanted.some(w => id === w || id.startsWith(`${w}-`) || id.startsWith(w)))
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

export function copyDir(from: string, to: string): void {
  mkdirSync(to, { recursive: true })
  cpSync(from, to, { recursive: true })
}

export function gitCommit(): string | null {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return null
  }
}
