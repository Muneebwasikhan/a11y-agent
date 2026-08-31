# Task contract

You are fixing the accessibility of a small self-contained web page. The same contract applies to every case, and the same contract is given to every solution being compared.

## Goal

Make the page meet WCAG 2.1 AA and make it genuinely usable from the keyboard alone, without changing the visual design.

## Preserve

- every data-track attribute and every id, kept on the same conceptual element even if its tag changes
- the instrumentation script that records clicks into window.__activated, do not remove or alter it
- visible text content, and the overall visual design, layout and hierarchy
- existing mouse behavior, and keyboard interactions must drive the same behavior as the mouse path, not a parallel imitation of it

## Constraints

- plain HTML, CSS and JavaScript only, no external libraries, fonts or network requests
- custom-styled widgets stay custom, swapping one for a bare native control is not acceptable to the design team
- edit files in place and keep changes focused on accessibility
