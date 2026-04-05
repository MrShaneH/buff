export interface PageSlice {
  htmlSkeleton: string;
  existingCSS: string;
  viewport: { width: number; height: number };
  url: string;
  sliceIndex: number;
  totalEstimatedSlices: number;
}

export function extractPageStructure(sliceIndex = 0): PageSlice {
  // Step 1: Deep clone the document element
  const clone = document.documentElement.cloneNode(true) as HTMLElement;

  // Step 2: Remove all text nodes
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }
  for (const textNode of textNodes) {
    textNode.textContent = '';
  }

  // Step 3: Remove non-structural elements
  const nonStructural = clone.querySelectorAll('script, noscript, svg, img, video, iframe');
  for (const el of Array.from(nonStructural)) {
    el.parentNode?.removeChild(el);
  }

  // Step 4: Collect top-level sections
  const allSections = Array.from(
    clone.querySelectorAll('body > *, main > *, article > *'),
  );

  // Step 5: Calculate slice size
  const sliceSize = Math.ceil(allSections.length / 3) || 1;

  // Step 6: Total estimated slices
  const totalEstimatedSlices = Math.max(1, Math.ceil(allSections.length / sliceSize));

  // Step 7: Select sections for the requested slice
  const start = sliceIndex * sliceSize;
  const sliceSections = allSections.slice(start, start + sliceSize);

  // Step 8: Build htmlSkeleton, truncate to 15000 chars
  const rawSkeleton = sliceSections.map((el) => (el as HTMLElement).outerHTML).join('\n');
  const htmlSkeleton = rawSkeleton.slice(0, 15000);

  // Step 9: CSS extraction
  const cssRules: string[] = [];
  const sheets = Array.from(document.styleSheets);
  for (const sheet of sheets) {
    if (sheet.href && !sheet.href.startsWith(location.origin)) {
      continue;
    }
    try {
      const rules = Array.from(sheet.cssRules).map((r) => r.cssText);
      cssRules.push(...rules);
    } catch {
      // Cross-origin or inaccessible sheet — skip
    }
  }

  // Step 10: Partition rules
  const layoutKeywords = ['width', 'display', 'float', 'grid', 'flex', 'position', 'margin', 'padding'];
  const layoutRules: string[] = [];
  const otherRules: string[] = [];
  for (const rule of cssRules) {
    if (layoutKeywords.some((kw) => rule.includes(kw))) {
      layoutRules.push(rule);
    } else {
      otherRules.push(rule);
    }
  }

  // Step 11: Concatenate and truncate to 10000 chars
  const rawCSS = [...layoutRules, ...otherRules].join('\n');
  const existingCSS = rawCSS.slice(0, 10000);

  // Step 12: Return
  return {
    htmlSkeleton,
    existingCSS,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    url: location.hostname,
    sliceIndex,
    totalEstimatedSlices,
  };
}
