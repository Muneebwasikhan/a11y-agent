# Reproduction guide

Written for a clean environment. Tier 1 reproduces the main result with no credentials and no cost. Tier 2 regenerates the model runs and needs either an API key or an existing Claude Code login.

## Requirements

- Node.js 20.12 or newer (developed on Node 24)
- macOS or Linux with roughly 400 MB free disk (Chromium download included)
- git, to clone the repository

## Tier 1: verify the main result, no API key

```
npm ci
npm run setup
npm run verify
```

- `npm ci` installs pinned dependencies. Never pass `--omit=optional`, the Claude Agent SDK ships its runtime as a platform-specific optional dependency.
- `npm run setup` downloads the pinned Chromium build for Playwright, roughly 130 MB.
- `npm run verify` re-scores every committed run in `runs-archive/` from scratch on your machine: it serves each stored working copy, re-runs the axe scan, the keyboard checks and the layout comparison in a real browser, then diffs the recomputed gates and axe counts against the committed `results.json` and prints MATCH or MISMATCH per case, followed by the regenerated comparison table.

Expected: every row prints MATCH (180 case comparisons across the 15 archived runs), then the table in `runs-archive/REPORT.md` is rewritten from the recomputed data. Wall time is roughly 15 minutes, cost is zero, nothing leaves your machine.

What this proves: the committed model outputs really do produce the claimed pass rates under the same measurement, re-executed end to end locally. The model outputs themselves are the evidence artifacts, the measurement is what you reproduce.

## Tier 2: regenerate the runs, optional

Credentials, either one works:

- copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`, a standard workspace API key is the smoothest choice
- or nothing at all if this machine already has a logged-in Claude Code, the agent runner finds it (the baseline runner still needs a key)

If your key is the newer identity-linked kind, the API also requires a workspace id: add `ANTHROPIC_WORKSPACE_ID=<your workspace id>` to `.env` and the baseline runner sends it as a request header.

Model selection: `MODEL` in `.env`, default `claude-sonnet-5`. Final archived runs should state their model in `meta.json`.

```
npm run eval:before        # score the untreated fixtures, free, no credentials
npm run baseline           # one direct call per case, about 2 minutes
npm run agent              # full agent per case, about 20 to 40 minutes
npm run report             # merge the three newest runs into REPORT.md
```

Useful flags, everything composes:

```
npm run agent -- --case 09                 # a single case
npm run agent -- --variant v2-audit        # capability variants v1-notools through v5-memory
npm run score -- agent-v4-skill-<ts>       # re-score any run directory
npm run promote -- agent-v4-skill-<ts>     # copy a finished run into runs-archive/
```

Approximate cost for a full 12-case sweep, client-side estimates: baseline about $0.10 to $0.40, agent about $2 to $4 on claude-sonnet-5 or $5 to $10 on claude-opus-5. One agent case runs $0.10 to $0.35 on sonnet. Runtime varies with model speed and iteration count, the per-case cap is $1.50 and 10 minutes.

## Data

All inputs are the synthetic fixtures committed under `fixtures/`, no external data, no personal data, no network access at runtime beyond the Anthropic API in Tier 2.

## Pinned versions

Dependencies are pinned exactly in `package.json` (Agent SDK 0.3.251, Playwright 1.62.1, axe-core via @axe-core/playwright 4.13.0, pixelmatch 7.2.0). Chromium is pinned by Playwright. Runs record model, SDK version, Node version and git commit in their `meta.json`.

## Determinism notes

Scoring is designed to be reproducible: serial execution, fixed 1280x800 viewport, animations disabled, fonts awaited, tolerance bands on layout. Gate booleans and axe counts are stable across machines. Pixel-diff ratios and screenshots can differ slightly across platforms because of font rendering, they are recorded as evidence and never gate or get compared by `verify`. Model generation in Tier 2 is inherently nondeterministic, archived runs are single samples unless their meta says otherwise.
