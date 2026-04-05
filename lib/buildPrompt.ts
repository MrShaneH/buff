import type { PageSlice } from './extractPageStructure';

export function buildPrompt(pageData: PageSlice, userHint?: string): string {
  const progressNote =
    pageData.totalEstimatedSlices > 1
      ? `This is section ${pageData.sliceIndex + 1} of ~${pageData.totalEstimatedSlices} sections on the page.`
      : '';

  const hintLine = userHint ? `The user has also requested: "${userHint}"` : '';

  return `You are an expert CSS developer. You will receive the HTML skeleton and CSS of a website.
Your job is to return ONLY a CSS string that, when injected as a <style> block, will:

1. Make the layout fully responsive and mobile-friendly
2. Improve typography (readable font sizes, line heights, sensible font stacks)
3. Modernise the visual design (clean spacing, updated colour palette if needed)
4. Fix obvious accessibility issues (contrast, touch target sizes)
5. NOT break any existing functionality or layout logic
6. NOT use the * selector
7. Prefix ALL selectors with .buff-active for high specificity (e.g. .buff-active body, .buff-active .container)
8. NOT use position: fixed or position: absolute unless strictly necessary for a navigation element
${progressNote ? `\n${progressNote}` : ''}${hintLine ? `\n${hintLine}` : ''}

Return ONLY valid CSS. No markdown fences, no explanation, no preamble.

PAGE DATA:
${JSON.stringify(pageData)}`;
}
