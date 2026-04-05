import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../lib/buildPrompt';
import type { PageSlice } from '../lib/extractPageStructure';

const baseSlice: PageSlice = {
  htmlSkeleton: '<div><p></p></div>',
  existingCSS: 'body { margin: 0; }',
  viewport: { width: 1280, height: 800 },
  url: 'example.com',
  sliceIndex: 0,
  totalEstimatedSlices: 1,
};

describe('buildPrompt', () => {
  it('output contains the serialised pageData JSON', () => {
    const result = buildPrompt(baseSlice);
    expect(result).toContain(JSON.stringify(baseSlice));
  });

  it('instructs the AI to prefix all selectors with .buff-active', () => {
    const result = buildPrompt(baseSlice);
    expect(result).toContain('.buff-active');
  });

  it('includes the user hint when provided', () => {
    const result = buildPrompt(baseSlice, 'make it darker');
    expect(result).toContain('make it darker');
  });

  it('omits the hint section entirely when no hint is provided', () => {
    const result = buildPrompt(baseSlice);
    expect(result).not.toContain('user has also requested');
  });

  it('includes a slice progress note when totalEstimatedSlices > 1', () => {
    const multiSlice: PageSlice = { ...baseSlice, sliceIndex: 1, totalEstimatedSlices: 3 };
    const result = buildPrompt(multiSlice);
    expect(result).toContain('section 2 of ~3');
  });

  it('omits the progress note when totalEstimatedSlices === 1', () => {
    const result = buildPrompt(baseSlice);
    expect(result).not.toContain('section 1 of');
  });

  it('includes both hint and progress note when both are provided', () => {
    const multiSlice: PageSlice = { ...baseSlice, sliceIndex: 0, totalEstimatedSlices: 2 };
    const result = buildPrompt(multiSlice, 'increase font size');
    expect(result).toContain('section 1 of ~2');
    expect(result).toContain('increase font size');
  });
});
