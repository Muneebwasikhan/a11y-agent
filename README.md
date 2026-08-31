# a11y-agent

An agentic workflow that remediates web accessibility defects and proves, with a local verification harness, that its fixes hold up where automated linters cannot see: keyboard reachability, activation behavior, focus indicators, dialog focus management, and visual integrity.

Built for the micro1 Agentic Workflows Hackathon. Everything in this repository was created during the competition, nothing existed beforehand.

## Who has this problem

Frontend teams shipping under WCAG 2.1 AA obligations. The European Accessibility Act has applied to most consumer-facing digital products since June 2025, and accessibility lawsuits keep climbing in the US. An audit lands on a developer's desk as a list of dozens or hundreds of violations across components.

## The bottleneck

Fixing accessibility findings is repetitive but risky, and the verification cost dominates. Every fix needs a re-scan, a visual check and a keyboard pass. Worse, the tempting fixes are often fake: sprinkling aria attributes until the scanner goes quiet can leave the page less usable for the people the fix was meant to serve. Scanners like axe-core catch only a minority of real-world defects, and none of the behavioral ones: a mouse-only dropdown, a dialog that never traps focus, an outline: none that erases every focus indicator. Those are exactly the defects that take the most manual time to find and re-verify.

Why not just run an auto-fixer? Because the hard failures here are behavioral, not attribute-level. There is no mechanical rewrite from a mouse-only div dropdown to a correct ARIA listbox with arrow-key navigation, that is judgment work over the page's own JavaScript, and it needs to be verified in a real browser afterwards.

## What the solution does

For each defective page, an agent built on the Claude Agent SDK works inside an isolated copy, audits it with real tools (an axe-core scan, a keyboard-behavior observer, a screenshot preview), edits the files, and re-verifies until clean. A separate harness then scores the result against three gates, all computed in a real browser:

1. **axe**: zero violations under WCAG 2.1 A, AA and best-practice rules
2. **keyboard**: every interactive element Tab-reachable in the right order, activated by Enter and Space, with a visible focus indicator, plus behavioral probes for the dialog focus trap and the dropdown arrow-key pattern
3. **layout**: no element lost or collapsed, no overflow introduced, page height stable, so fixes cannot win by breaking the design

A case passes only if all three gates hold. The agent never sees the scoring code, the case specifications or the thresholds, its tools report raw observations only. Sandbox proof is recorded per run: read denials on the harness and fixtures, no shell or network tools, no permission bypass of any kind, and every denial is counted in the results.

## The experiment

The baseline is one direct structured-output call to the same model with the identical task contract and files, no tools and no iteration. The agent gets the same contract plus tools and the ability to iterate. That delta is the experiment. Fixtures are 12 synthetic but realistic components, each seeding one defect category, including one designated challenging case (09-custom-dropdown) that passes axe almost clean while being unusable from the keyboard.

Human involvement in both arms is zero during the run, and the intended workflow keeps a developer reviewing the produced diff before anything ships, the agent proposes, a person disposes.

## Results

See [runs-archive/REPORT.md](runs-archive/REPORT.md) for the committed, independently verifiable comparison, [SOLUTION-REPORT.pdf](SOLUTION-REPORT.pdf) for the full narrative, and reproduce every number without an API key via `npm run verify`, see [REPRODUCE.md](REPRODUCE.md).

## Improvement Changelog

The full experiment log, with one row per iteration and evidence pointers into the committed archive, lives in [CHANGELOG.pdf](CHANGELOG.pdf).

## Repository map

- `fixtures/` the 12 seeded cases, each with a case.json contract used only by the harness
- `harness/` browser, axe, keyboard, layout, screenshot, scoring, reporting, promotion
- `baseline/` the one-shot baseline runner
- `agent/` the SDK agent runner, its tools, system prompt and skill
- `runs/` local scratch output, gitignored
- `runs-archive/` committed final runs that judges re-score locally
- `TASK_CONTRACT.md` the shared spec both arms receive verbatim

## Main failure mode and hot take

Observed across the three-by-two sweep ladder on claude-haiku-4-5 (full log in the changelog): the one-shot baseline never produces working focus management, keyboard dropdown behavior or sufficient contrast, five cases scored zero for three sweeps, because plausible-looking markup fails real key presses. That gap between plausible and verified is the main failure mode of unverified generation. Even the tool-equipped agent's only genuine miss was the modal's focus return, the subtlest behavior in the whole set.

Hot take: an agent optimizes whatever its verifier checks, and so does a benchmark. Our first task contract contained the rubric and every arm saturated at 12/12, measuring spec-following instead of capability, so we cut the contract down to a realistic ticket and the floor dropped out. And pass at first attempt measures luck, worst-of-N against behavioral gates measures deployable quality. Put the engineering effort into the verifier, it is the only part of the system the model cannot fake.
