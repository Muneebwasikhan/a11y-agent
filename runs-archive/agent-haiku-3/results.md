# Results: agent-v3-verify-2026-08-31T03-20-44

Generated 2026-08-31T06:32:15.894Z. Composite pass rate: **11/12**.

| Case | Axe before | Axe after | Keyboard | Layout | Pixel diff | Pass | Cost USD | Turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01-missing-labels | 4 | 0 | pass | pass | 2.6% | pass | 0.054 | 12 |
| 02-low-contrast | 9 | 0 | pass | pass | 1.6% | pass | 0.069 | 18 |
| 03-div-buttons | 0 | 0 | pass | pass | 0.1% | pass | 0.043 | 13 |
| 04-missing-alt | 4 | 0 | pass | pass | 0.0% | pass | 0.041 | 13 |
| 05-heading-order | 2 | 0 | pass | pass | 0.0% | pass | 0.038 | 13 |
| 06-focus-indicators | 0 | 0 | pass | pass | 0.0% | pass | 0.037 | 13 |
| 07-modal | 0 | 0 | FAIL | pass | 0.0% | FAIL |  |  |
| 08-form-errors | 3 | 0 | pass | pass | 0.1% | pass | 0.053 | 15 |
| 09-custom-dropdown | 0 | 0 | pass | pass | 0.0% | pass | 0.122 | 19 |
| 10-landmarks | 5 | 0 | pass | pass | 0.0% | pass | 0.040 | 12 |
| 11-lang-title | 2 | 0 | pass | pass | 0.0% | pass | 0.029 | 11 |
| 12-tabindex-order | 5 | 0 | pass | pass | 0.0% | pass | 0.055 | 14 |

## Failure detail

- **07-modal**: modalTrap: focus escapes the open modal while tabbing, runner: timeout

