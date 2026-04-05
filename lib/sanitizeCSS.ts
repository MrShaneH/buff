export function sanitizeCSS(rawCSS: string): string {
  let css = rawCSS;

  // 1. Strip `* { ... }` selector blocks entirely (universal selector rule)
  css = css.replace(/\*\s*\{[^}]*\}/g, '');

  // 2. Strip @import rules
  css = css.replace(/@import\b[^;]*;/g, '');

  // 3. Remove `position: fixed` declarations
  css = css.replace(/position\s*:\s*fixed\s*;?/g, '');

  // 4. Remove `position: absolute` declarations
  css = css.replace(/position\s*:\s*absolute\s*;?/g, '');

  // 5. Remove pixel-exact `width: <n>px` declarations (standalone property only)
  css = css.replace(/\bwidth\s*:\s*\d+px\s*;?/g, '');

  // 6. Remove pixel-exact `height: <n>px` declarations (standalone property only)
  css = css.replace(/\bheight\s*:\s*\d+px\s*;?/g, '');

  // 7. Remove `display: none` declarations
  css = css.replace(/display\s*:\s*none\s*;?/g, '');

  // 8. Remove z-index values greater than 999 (replace with empty string)
  css = css.replace(/z-index\s*:\s*(\d+)\s*;?/g, (match, value) => {
    return parseInt(value, 10) > 999 ? '' : match;
  });

  return css.trim();
}
