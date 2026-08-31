# Results: agent-v2-audit-2026-08-31T09-25-51

Generated 2026-08-31T09:38:08.134Z. Composite pass rate: **10/12**.

| Case | Axe before | Axe after | Keyboard | Layout | Pixel diff | Pass | Cost USD | Turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01-missing-labels | 4 | 0 | pass | pass | 2.6% | pass | 0.045 | 11 |
| 02-low-contrast | 9 | 0 | pass | pass | 1.6% | pass | 0.084 | 23 |
| 03-div-buttons | 0 | 0 | pass | pass | 0.0% | pass | 0.038 | 12 |
| 04-missing-alt | 4 | 0 | pass | pass | 0.0% | pass | 0.043 | 13 |
| 05-heading-order | 2 | 0 | pass | pass | 3.6% | pass | 0.055 | 15 |
| 06-focus-indicators | 0 | 0 | pass | pass | 0.0% | pass | 0.029 | 10 |
| 07-modal | 0 | 0 | FAIL | pass | 0.0% | FAIL | 0.044 | 12 |
| 08-form-errors | 3 | 0 | pass | pass | 0.1% | pass | 0.039 | 10 |
| 09-custom-dropdown | 0 | 0 | FAIL | pass | 0.0% | FAIL | 0.091 | 20 |
| 10-landmarks | 5 | 0 | pass | pass | 0.0% | pass | 0.040 | 13 |
| 11-lang-title | 2 | 0 | pass | pass | 0.0% | pass | 0.038 | 16 |
| 12-tabindex-order | 5 | 0 | pass | pass | 0.0% | pass | 0.044 | 16 |

## Failure detail

- **07-modal**: modalTrap: focus escapes the open modal while tabbing
- **09-custom-dropdown**: activation failures: dd-toggle(enter), dropdownKeyboard: arrow keys plus Enter did not select an option

