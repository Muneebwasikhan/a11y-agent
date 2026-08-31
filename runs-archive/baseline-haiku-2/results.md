# Results: baseline-2026-08-30T16-52-35

Generated 2026-08-30T16:54:16.787Z. Composite pass rate: **7/12**.

| Case | Axe before | Axe after | Keyboard | Layout | Pixel diff | Pass | Cost USD | Turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01-missing-labels | 4 | 0 | pass | pass | 2.6% | pass | 0.007 |  |
| 02-low-contrast | 9 | 9 | pass | pass | 0.0% | FAIL | 0.007 |  |
| 03-div-buttons | 0 | 0 | pass | pass | 0.1% | pass | 0.007 |  |
| 04-missing-alt | 4 | 0 | pass | pass | 0.0% | pass | 0.008 |  |
| 05-heading-order | 2 | 0 | pass | pass | 3.5% | pass | 0.006 |  |
| 06-focus-indicators | 0 | 0 | pass | pass | 0.0% | pass | 0.008 |  |
| 07-modal | 0 | 0 | FAIL | pass | 0.0% | FAIL | 0.012 |  |
| 08-form-errors | 3 | 3 | pass | pass | 0.0% | FAIL | 0.007 |  |
| 09-custom-dropdown | 0 | 0 | FAIL | pass | 1.2% | FAIL | 0.013 |  |
| 10-landmarks | 5 | 1 | pass | pass | 0.0% | FAIL | 0.006 |  |
| 11-lang-title | 2 | 0 | pass | pass | 0.0% | pass | 0.009 |  |
| 12-tabindex-order | 5 | 0 | pass | pass | 0.0% | pass | 0.007 |  |

## Failure detail

- **02-low-contrast**: 9 axe violations (color-contrast)
- **07-modal**: activation failures: open-modal(enter), open-modal(space), modalTrap: focus escapes the open modal while tabbing, Escape does not close the modal
- **08-form-errors**: 3 axe violations (color-contrast), runner: api_error: 500 {"type":"error","error":{"type":"api_error","message":"Internal server error"},"request_id":"req_011CeZHGwfR5fcoqzZMVE6jt"}
- **09-custom-dropdown**: dropdownKeyboard: Enter on the toggle did not open [data-dd-list]
- **10-landmarks**: 1 axe violations (region)

