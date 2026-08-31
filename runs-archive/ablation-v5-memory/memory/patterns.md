# Shared fix notes

Lessons appended by earlier cases in this run.

## Color contrast: Darken foreground, preserve design

When fixing color contrast violations, prioritize darkening text colors over changing backgrounds. Light gray text (#a8adb5, #b9bec6, #bcc1c8, etc.) on white needs systematic darkening: use medium grays (#606569, #5a6168) for secondary content, slightly darker for body text. For colored buttons, ensure background darkness supports white text (4.5:1 minimum): a blue like #86a9ef needs darkening to #3d5598 for white text. This approach maintains visual hierarchy and design intent while meeting WCAG 2.1 AA contrast requirements.

## Image alt text: Distinguish informative from decorative

Every image must have an alt attribute. For informative images (photos, illustrations that convey content), use descriptive alt text that communicates what the image shows—especially in grids or galleries where the image is the primary content (e.g., "Harbor Morning, edition of 40"). For purely decorative images that serve only visual design (dividers, icons used only to add spacing or visual interest), use an empty alt string (alt=""). This ensures screen reader users get the context they need for content-bearing images while avoiding announcement clutter from decoration.

## Heading hierarchy: One h1 per page, levels increase by one

Every page must have exactly one h1 (the main heading), and heading levels must increase sequentially—never skip downward (h1 to h3, h2 to h5, etc.). To fix a broken hierarchy without changing visual design, change the tag itself and update the CSS selector to match. For example, if the page uses h3.title for the main heading and h5 for sections, change h3 to h1 and h5 to h2, then update the CSS rules (h1.title, h2) to preserve all sizing and spacing. This preserves layout while creating the proper outline that assistive technology relies on.

## Focus indicators: Never remove without providing visible replacement

Globally removing focus outlines with `*:focus { outline: none }` breaks keyboard navigation for all users. Always replace with `*:focus-visible { outline: 2px solid [color]; outline-offset: 2px }` to provide visible focus indicators. The outline should use a color that contrasts with nearby page elements—if the page uses blue accents like #2456c4, match that for visual consistency. The :focus-visible pseudo-class ensures the indicator only shows for keyboard navigation (not mouse), and the 2px outline with 2px offset provides clear, non-intrusive visibility without overlapping content.

## Modal dialogs: Complete focus and keyboard management

Modal dialogs need four layers of accessibility: semantic markup, focus management, keyboard trapping, and restoration. Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal's heading (add an id to the heading). On open, save the element that triggered the modal, add `.open` class to display it, set `aria-hidden="true"` and `pointer-events: none` on the overlay to make it inert, then move focus to the first focusable element inside (typically an input). Trap Tab navigation within the modal by preventing Tab from the last focusable element and Shift+Tab from the first, wrapping focus to the opposite end instead. Add an Escape key handler that closes the modal and restores focus to the triggering element. Use `getFocusableElements()` to select all inputs and buttons within the modal (querySelectorAll('input, button')), ensuring the focus trap stays current if modal content changes. This pattern ensures keyboard users can open the modal, navigate within it, close it with Escape, and return to their previous position.

## Error and status message colors: Saturated, darker reds for sufficient contrast

Error messages and status indicators often use light red/salmon colors (like #e2685f) that fail contrast requirements on white backgrounds. Darken these to saturated, deeper reds like #a83a30 or #c1403a to achieve 4.5:1 contrast while maintaining the error aesthetic. This applies to inline error messages, summary alerts, and any validation feedback. The darker red remains instantly recognizable as an error color but provides legibility for all users, including those with low vision or color perception differences.

## Custom dropdown/listbox: Complete keyboard control with roving tabindex

A div-based dropdown toggle and options need three layers: semantic ARIA, keyboard navigation, and focus management. Add `role="button"` with `tabindex="0"` to the toggle, and `aria-haspopup="listbox"`, `aria-expanded`, and `aria-controls` to connect it to the list. On the list, add `role="listbox"` with `aria-labelledby`. On options, use `role="option"` with roving tabindex: all options start at `tabindex="-1"`, and only the active option gets `tabindex="0"`. Keyboard handlers: Enter/Space on toggle calls `toggle.click()` to trigger both open/close logic and tracking (essential for maintaining the mouse and keyboard paths); ArrowDown/ArrowUp call `setActiveOption()` to move focus and update tabindex/aria-selected; Enter on options calls `option.click()` to select and return focus to toggle; Escape closes and returns focus to toggle. Add `list.addEventListener('focusout', ...)` to auto-close when focus leaves (prevents open dropdown while keyboard navigation moves to other elements). Provide `:focus-visible` styles with a 2px outline in a contrasting color for both toggle and options; use `outline-offset: 2px` for the toggle and `outline-offset: -2px` for options (inset) to work within their compact padding.

## Landmarks: One main plus header, nav, footer wrappers

Every page needs exactly one `<main>` landmark containing the primary content, plus `<header>` for navigation and branding, `<nav>` for navigation links, and `<footer>` for footer content. Convert generic divs to semantic landmark elements: replace `<div class="top">` with `<header class="top">`, wrap navigation in `<nav class="links">`, wrap main content in `<main>`, and replace `<div class="bottom">` with `<footer class="bottom">`. Preserve all class names and ids so CSS selectors remain valid—landmarks are structural changes, not class changes. This creates the document outline that screen reader users rely on to navigate and understand page structure, and satisfies the landmark-one-main and region coverage requirements.

## Document metadata: lang attribute and title element

Every HTML document requires two metadata items for accessibility and usability: add `lang="en"` (or the appropriate language code) to the `<html>` element so assistive technology announces the document language correctly, and add a descriptive `<title>` element in the `<head>` (e.g., `<title>The Millhouse reopens on the first of May</title>`). The title appears in browser tabs, bookmarks, and history, providing context for users. Screen readers announce the title when the page loads, helping users understand what they've navigated to. These are foundational requirements that prevent "document-title" and "html-has-lang" violations and must never be omitted, even on simple pages.

## Tab order: Remove positive tabindex values, follow DOM order

Any tabindex value greater than zero (1, 2, 3, etc.) overrides the natural DOM order and breaks keyboard navigation predictability. The fix is simple: remove all positive tabindex attributes and rely on DOM order instead. If the visual layout disagrees with the DOM order (for example, a sidebar in the markup before main content), reorder the DOM to match the visual flow left-to-right, top-to-bottom. Use tabindex="0" only when making custom widgets focusable; tabindex="-1" for removing elements from tab order but keeping them focusable programmatically. This ensures keyboard users navigate in a logical, predictable sequence that matches the page's visual and content hierarchy.
