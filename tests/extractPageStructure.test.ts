import { beforeEach, describe, expect, it } from 'vitest';
import { extractPageStructure } from '../lib/extractPageStructure';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('extractPageStructure', () => {
  it('empty page returns valid PageSlice with empty htmlSkeleton', () => {
    document.body.innerHTML = '';
    const result = extractPageStructure();
    expect(result.htmlSkeleton).toBe('');
    expect(result.sliceIndex).toBe(0);
    expect(result.totalEstimatedSlices).toBe(1);
    expect(result.url).toBeDefined();
    expect(result.viewport).toBeTypeOf('object');
  });

  it('strips text nodes from htmlSkeleton', () => {
    document.body.innerHTML = '<div><p>Hello world</p></div>';
    const result = extractPageStructure();
    expect(result.htmlSkeleton).not.toContain('Hello world');
    expect(result.htmlSkeleton).toContain('<p');
    expect(result.htmlSkeleton).toContain('<div');
  });

  it('removes non-structural elements (img, script)', () => {
    document.body.innerHTML =
      '<div><img src="x.png"><script>alert(1)</script><p>content</p></div>';
    const result = extractPageStructure();
    expect(result.htmlSkeleton).not.toContain('<img');
    expect(result.htmlSkeleton).not.toContain('<script');
  });

  it('truncates htmlSkeleton to 15000 chars', () => {
    // Create enough elements to exceed 15000 chars of HTML
    const many = Array.from({ length: 200 }, (_, i) =>
      `<div class="item-${i}" data-value="${'x'.repeat(100)}"><!-- node ${i} --></div>`,
    ).join('');
    document.body.innerHTML = many;
    const result = extractPageStructure();
    expect(result.htmlSkeleton.length).toBeLessThanOrEqual(15000);
  });

  it('sliceIndex partitioning returns different content with correct totalEstimatedSlices', () => {
    // 9 direct children → sliceSize = ceil(9/3) = 3, totalEstimatedSlices = 3
    document.body.innerHTML = Array.from(
      { length: 9 },
      (_, i) => `<section id="s${i}"></section>`,
    ).join('');

    const slice0 = extractPageStructure(0);
    const slice1 = extractPageStructure(1);

    expect(slice0.totalEstimatedSlices).toBe(3);
    expect(slice1.totalEstimatedSlices).toBe(3);
    expect(slice0.htmlSkeleton).not.toBe(slice1.htmlSkeleton);
    expect(slice0.sliceIndex).toBe(0);
    expect(slice1.sliceIndex).toBe(1);
  });

  it('layout CSS rules appear before decorative rules', () => {
    const style = document.createElement('style');
    style.textContent = `
      .decorative { color: red; }
      .layout { display: flex; }
    `;
    document.head.appendChild(style);

    const result = extractPageStructure();
    expect(result.existingCSS).toContain('display');
    expect(result.existingCSS).toContain('color');
    const displayPos = result.existingCSS.indexOf('display');
    const colorPos = result.existingCSS.indexOf('color');
    expect(displayPos).toBeLessThan(colorPos);
  });
});
