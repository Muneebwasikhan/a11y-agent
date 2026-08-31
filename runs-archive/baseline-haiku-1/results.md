# Results: baseline-2026-08-30T16-50-59

Generated 2026-08-30T16:52:34.372Z. Composite pass rate: **4/12**.

| Case | Axe before | Axe after | Keyboard | Layout | Pixel diff | Pass | Cost USD | Turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01-missing-labels | 4 | 0 | pass | pass | 2.6% | pass | 0.006 |  |
| 02-low-contrast | 9 | 9 | pass | pass | 0.0% | FAIL | 0.007 |  |
| 03-div-buttons | 0 | 0 | pass | pass | 0.0% | pass | 0.006 |  |
| 04-missing-alt | 4 | 0 | pass | pass | 0.0% | pass | 0.008 |  |
| 05-heading-order | 2 | 2 | pass | pass | 0.0% | FAIL | 0.006 |  |
| 06-focus-indicators | 0 | 0 | pass | pass | 0.0% | pass | 0.008 |  |
| 07-modal | 0 | 0 | FAIL | pass | 0.0% | FAIL | 0.013 |  |
| 08-form-errors | 3 | 3 | pass | pass | 0.0% | FAIL | 0.008 |  |
| 09-custom-dropdown | 0 | 0 | FAIL | pass | 1.2% | FAIL | 0.014 |  |
| 10-landmarks | 5 | 1 | pass | pass | 0.0% | FAIL | 0.006 |  |
| 11-lang-title | 2 | 2 | pass | pass | 0.0% | FAIL | 0.005 |  |
| 12-tabindex-order | 5 | 5 | FAIL | pass | 0.0% | FAIL |  |  |

## Failure detail

- **02-low-contrast**: 9 axe violations (color-contrast)
- **05-heading-order**: 2 axe violations (heading-order, page-has-heading-one)
- **07-modal**: modalTrap: focus escapes the open modal while tabbing
- **08-form-errors**: 3 axe violations (color-contrast)
- **09-custom-dropdown**: activation failures: dd-toggle(enter), dropdownKeyboard: arrow keys plus Enter did not select an option
- **10-landmarks**: 1 axe violations (region)
- **11-lang-title**: 2 axe violations (document-title, html-has-lang)
- **12-tabindex-order**: 5 axe violations (tabindex), tab order differs from the expected visual order, runner: api_error: 500 {"type":"error","error":{"type":"api_error","message":"Internal server error"},"request_id":"req_011CeZHCUCZX7X4gX3Unie6J"}

