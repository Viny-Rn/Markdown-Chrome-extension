# Issue: Split view heading rendering bug

## Summary
When split view is active, heading rendering in the preview pane is inconsistent.

## Steps to reproduce
1. Open the extension.
2. Switch to **Split** view.
3. Add headings such as `#`, `##`, `###`, `#####`, `######` in the editor.

## Expected behavior
- Heading levels should render at the correct size in preview mode.
- `###` should match the normal heading 3 style.
- `#####` and `######` should render with their respective smaller heading sizes.

## Actual behavior
- `###` is shown in red in the preview pane when split view is active.
- `#####` and `######` do not display at the correct size.

## Notes
This appears to be a preview rendering issue specifically tied to split view.

## Files to inspect
- `style.css`
- `app.js`
- `editor.html`
