# Results: agent-v1-notools-2026-08-31T09-14-23

Generated 2026-08-31T09:25:50.132Z. Composite pass rate: **9/12**.

| Case | Axe before | Axe after | Keyboard | Layout | Pixel diff | Pass | Cost USD | Turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01-missing-labels | 4 | 0 | pass | pass | 0.0% | pass | 0.040 | 8 |
| 02-low-contrast | 9 | 0 | pass | pass | 1.6% | pass | 0.072 | 10 |
| 03-div-buttons | 0 | 0 | pass | pass | 0.0% | pass | 0.029 | 8 |
| 04-missing-alt | 4 | 0 | pass | pass | 0.0% | pass | 0.042 | 10 |
| 05-heading-order | 2 | 0 | pass | pass | 0.0% | pass | 0.042 | 11 |
| 06-focus-indicators | 0 | 0 | pass | pass | 0.0% | pass | 0.030 | 7 |
| 07-modal | 0 | 0 | pass | pass | 0.0% | pass | 0.055 | 10 |
| 08-form-errors | 3 | 3 | pass | pass | 0.0% | FAIL | 0.034 | 8 |
| 09-custom-dropdown | 0 | 0 | FAIL | pass | 0.0% | FAIL | 0.089 | 20 |
| 10-landmarks | 5 | 5 | pass | pass | 0.0% | FAIL | 0.028 | 7 |
| 11-lang-title | 2 | 0 | pass | pass | 0.0% | pass | 0.042 | 9 |
| 12-tabindex-order | 5 | 0 | pass | pass | 0.0% | pass | 0.048 | 11 |

## Failure detail

- **08-form-errors**: 3 axe violations (color-contrast)
- **09-custom-dropdown**: activation failures: dd-toggle(enter), dropdownKeyboard: arrow keys plus Enter did not select an option
- **10-landmarks**: 5 axe violations (landmark-one-main, region)

