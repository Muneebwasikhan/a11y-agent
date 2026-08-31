# WCAG fix patterns

Field-tested patterns for the defect categories that come up most often. Apply the one that matches, adapt naming and style to the page at hand.

## Labels
Text sitting near an input is not a label until it is a label element with for pointing at the input's id, or wrapping the input. Placeholders are hints, never accessible names. Selects need real labels the same way.

## Contrast
Target 4.5 to 1 for normal text and 3 to 1 for large text (24px, or 18.66px bold). Darken the foreground instead of changing backgrounds, it preserves the design's character. The usual offenders: soft gray body copy, fine print, and light text on tinted buttons.

## Clickable divs
Replace with button type="button", keeping every class, id and data attribute. Reset the button chrome in CSS (background, border, font, text-align inherit) so the design does not shift. If the tag truly must stay, add role="button", tabindex="0", and a keydown handler where Enter and Space call the element's click().

## Images
Informative images get an alt that says what the image conveys. Purely decorative images get alt="". Leaving alt off entirely is never correct.

## Headings
Exactly one h1 per page, and levels never skip downward. Change the tags to fix the structure and keep the rendered sizes with CSS classes.

## Focus indicators
Never remove an outline without providing a replacement. Add :focus-visible styles with a clearly visible ring, at least 2px, contrasting with the surface behind it.

## Dialogs
On open: remember the opener, move focus into the dialog, trap Tab and Shift+Tab at the edges, and make the background container inert (the inert attribute, or aria-hidden plus pointer-events none). On Escape or any close action: undo all of that and return focus to the opener. The dialog itself gets role="dialog", aria-modal="true" and an accessible name.

## Form errors
Wire every message to its field with aria-describedby and set aria-invalid="true" on the field. Announce dynamic errors with a live region, role="alert" for blocking problems. Color alone never carries the message, contrast rules apply to error text too.

## Custom listboxes and dropdowns
The toggle gets tabindex="0", combobox or button semantics, aria-haspopup="listbox" and aria-expanded. The list gets role="listbox" and the options role="option". Keyboard: Enter or Space opens, ArrowDown and ArrowUp move the active option, Enter selects by calling the active option's click() so the mouse and keyboard paths stay identical, Escape closes and returns focus to the toggle. Track the active option with aria-activedescendant or roving tabindex, and give it a visible highlight.

## Landmarks
Wrap the page regions in header, nav, main and footer. Every piece of visible content belongs inside a landmark, and there is exactly one main.

## Language and title
The html element carries a lang attribute. Every page has a descriptive title element.

## Tab order
Positive tabindex values are never the fix. Remove them and let DOM order carry focus, reordering the DOM if the visual order disagrees. Use tabindex="0" only to make custom widgets focusable.
