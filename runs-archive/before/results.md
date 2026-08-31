# Results: before

Generated 2026-08-29T18:28:04.226Z. Composite pass rate: **0/12**.

| Case | Axe before | Axe after | Keyboard | Layout | Pixel diff | Pass | Cost USD | Turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01-missing-labels | 4 | 4 | pass | pass | 0.0% | FAIL |  |  |
| 02-low-contrast | 9 | 9 | pass | pass | 0.0% | FAIL |  |  |
| 03-div-buttons | 0 | 0 | FAIL | pass | 0.0% | FAIL |  |  |
| 04-missing-alt | 4 | 4 | pass | pass | 0.0% | FAIL |  |  |
| 05-heading-order | 2 | 2 | pass | pass | 0.0% | FAIL |  |  |
| 06-focus-indicators | 0 | 0 | FAIL | pass | 0.0% | FAIL |  |  |
| 07-modal | 0 | 0 | FAIL | pass | 0.0% | FAIL |  |  |
| 08-form-errors | 3 | 3 | pass | pass | 0.0% | FAIL |  |  |
| 09-custom-dropdown | 0 | 0 | FAIL | pass | 0.0% | FAIL |  |  |
| 10-landmarks | 5 | 5 | pass | pass | 0.0% | FAIL |  |  |
| 11-lang-title | 2 | 2 | pass | pass | 0.0% | FAIL |  |  |
| 12-tabindex-order | 5 | 5 | FAIL | pass | 0.0% | FAIL |  |  |

## Failure detail

- **01-missing-labels**: 4 axe violations (label, select-name)
- **02-low-contrast**: 9 axe violations (color-contrast)
- **03-div-buttons**: unreachable: save, share, discard, activation failures: save(enter), save(space), share(enter), share(space), discard(enter), discard(space)
- **04-missing-alt**: 4 axe violations (image-alt)
- **05-heading-order**: 2 axe violations (heading-order, page-has-heading-one)
- **06-focus-indicators**: no focus indicator: nav-guides, nav-reference, search-go, whats-new
- **07-modal**: modalTrap: focus escapes the open modal while tabbing, Escape does not close the modal
- **08-form-errors**: 3 axe violations (color-contrast)
- **09-custom-dropdown**: unreachable: dd-toggle, activation failures: dd-toggle(enter), dropdownKeyboard: toggle [data-track=dd-toggle] is not focusable
- **10-landmarks**: 5 axe violations (landmark-one-main, region)
- **11-lang-title**: 2 axe violations (document-title, html-has-lang)
- **12-tabindex-order**: 5 axe violations (tabindex), tab order differs from the expected visual order

