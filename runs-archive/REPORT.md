# Archived comparison, reproducible without an API key

Untreated fixtures pass 0/12. Baseline is one direct structured-output call per case (claude-haiku-4-5, 3 sweeps). Agent is the iterative tool-using workflow (claude-haiku-4-5, 3 sweeps). Both receive the identical task contract and fixtures, the deliberate delta is tools plus iteration.

## Headline metrics

| Metric | Simple baseline | Agent solution | Change |
| --- | --- | --- | --- |
| Pass rate per sweep (all three gates) | 4/12, 7/12, 5/12 | 11/12, 12/12, 11/12 | see per-case table |
| Worst sweep (reliability floor) | 4/12 | 11/12 | the deployment-honest number |
| Cases passing every sweep | 4 | 11 | verification converts flaky into stable |
| Machine time per case, zero human minutes in both arms | 7.4s | 110.1s | unattended either way |
| Cost per sweep of 12, client-side estimate | $0.093 | $0.697 | quality is the trade |

## Per-case outcomes (passes across sweeps)

| Case | Untreated axe | Baseline | Agent |
| --- | --- | --- | --- |
| 01-missing-labels | 4 | 3/3 | 3/3 |
| 02-low-contrast | 9 | 0/3 | 3/3 |
| 03-div-buttons | 0 | 3/3 | 3/3 |
| 04-missing-alt | 4 | 3/3 | 3/3 |
| 05-heading-order | 2 | 1/3 | 3/3 |
| 06-focus-indicators | 0 | 3/3 | 3/3 |
| 07-modal | 0 | 0/3 | 1/3 |
| 08-form-errors | 3 | 0/3 | 3/3 |
| 09-custom-dropdown | 0 | 0/3 | 3/3 |
| 10-landmarks | 5 | 0/3 | 3/3 |
| 11-lang-title | 2 | 1/3 | 3/3 |
| 12-tabindex-order | 5 | 2/3 | 3/3 |

## Consistency detail

- Baseline never passes: 02-low-contrast, 07-modal, 08-form-errors, 09-custom-dropdown, 10-landmarks
- Baseline flaky: 05-heading-order, 11-lang-title, 12-tabindex-order
- Agent never passes: none
- Agent flaky: 07-modal

## Reading the table

- Cases 03, 06, 07 and 09 carry near-zero axe counts while seeding real keyboard failures, they measure what a linter cannot see.
- Every number above is recomputed by the harness from the stored working copies, run `npm run verify` to reproduce it locally without any API key.
- Full detail per run lives next to each run in results.md and results.json, per-case evidence in score.json and trajectory files.

