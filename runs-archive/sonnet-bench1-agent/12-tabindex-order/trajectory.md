# Trajectory: 12-tabindex-order

Session started with model claude-sonnet-5.

## Turn 1


## Turn 2

- tool call: **Glob** {"pattern":"**/*"}

- tool result: index.html
## Turn 3

- tool call: **Read** {"file_path":"/index.html"}

- tool result (error): Read is not permitted outside the case working copy. Work only within the current directory.
## Turn 4


## Turn 5

- tool call: **Glob** {"pattern":"*","path":"."}

- tool result: index.html
## Turn 6


## Turn 7

- tool call: **Read** {"file_path":"index.html"}

- tool result: 1 <!doctype html> 2 <html lang="en"> 3 <head> 4 <meta charset="utf-8"> 5 <meta name="viewport" content="width=device-width, initial-scale=1"> 6 <title>Table for Two, Reservation</title> 7 <style> 8 * { box-sizing: border-box } 9 body { margin: 0; font-family: system-ui, sans-serif; background: #f7f6f4; color: #26221f } 10 header { background: #fff; border-bottom: 1px solid #e7e3de; padding: 16px 3 ...
## Turn 8


## Turn 9

- tool call: **Edit** {"replace_all":false,"file_path":"index.html","old_string":" <input type=\"text\" id=\"first-name\" data-track=\"first-name\" tabindex=\"3\">\n </div>\n <div>\n <label for=\"last-name\">Last name</label>\n <input type=\"text\" id=\"last-name\" data-track=\"last-name\" tabindex=\"1\">\n </div>\n </di ...

- tool result: The file index.html has been updated successfully. (file state is current in your context — no need to Read it back)
## Turn 10


## Turn 11

- tool call: **Edit** {"replace_all":false,"file_path":"index.html","old_string":" .note { font-size: 12px; color: #6f675f; margin-top: 14px }\n","new_string":" .note { font-size: 12px; color: #6f675f; margin-top: 14px }\n input:focus-visible, button:focus-visible { outline: 3px solid #8c3b2e; outline-offset: 2px }\n"}

- tool result: The file index.html has been updated successfully. (file state is current in your context — no need to Read it back)
## Turn 12

> Now let me review the final file to confirm everything is correct.


## Turn 13

- tool call: **Read** {"file_path":"index.html"}

- tool result: 1 <!doctype html> 2 <html lang="en"> 3 <head> 4 <meta charset="utf-8"> 5 <meta name="viewport" content="width=device-width, initial-scale=1"> 6 <title>Table for Two, Reservation</title> 7 <style> 8 * { box-sizing: border-box } 9 body { margin: 0; font-family: system-ui, sans-serif; background: #f7f6f4; color: #26221f } 10 header { background: #fff; border-bottom: 1px solid #e7e3de; padding: 16px 3 ...
## Turn 14


## Turn 15

> ## Summary **Defects found:** 1. **Broken tab order (WCAG 2.4.3 Focus Order)** — Every form control had an explicit positive `tabindex` (`3, 1, 2, 5, 4`) that scrambled keyboard navigation into `last-name → email → first-name → book → party-size`, completely out of sync with the visual reading order (`first-name → last-name → email → party-size → book`). Positive `tabindex` values are also flagged by axe-core's best-practice ruleset. 2. **No reinforced focus indicator** — the page relied entirely on browser-default outlines with no explicit style, which is fragile across browsers/themes. **Fix ...


## Result

- outcome: success
- turns: 8, wall time: 60110ms, cost estimate: $0.0965754
- permission denials recorded: 1

