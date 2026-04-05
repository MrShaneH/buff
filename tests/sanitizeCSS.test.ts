import { describe, it, expect } from 'vitest';
import { sanitizeCSS } from '../lib/sanitizeCSS';

describe('sanitizeCSS', () => {
  // Rule 1: Strip * { ... } selector blocks
  it('strips universal selector * { ... } blocks', () => {
    const input = '* { margin: 0; padding: 0; } .foo { color: red; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('* {');
    expect(result).not.toContain('margin: 0');
    expect(result).toContain('.foo { color: red; }');
  });

  // Rule 2: Strip @import rules
  it('strips @import rules', () => {
    const input = "@import url('https://example.com/styles.css'); .foo { color: red; }";
    const result = sanitizeCSS(input);
    expect(result).not.toContain('@import');
    expect(result).toContain('.foo { color: red; }');
  });

  it('strips @import with string syntax', () => {
    const input = '@import "https://evil.com/track.css"; body { color: black; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('@import');
    expect(result).toContain('body { color: black; }');
  });

  // Rule 3: Remove position: fixed
  it('removes position: fixed declarations', () => {
    const input = '.overlay { position: fixed; top: 0; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('position: fixed');
    expect(result).toContain('top: 0');
  });

  // Rule 4: Remove position: absolute
  it('removes position: absolute declarations', () => {
    const input = '.popup { position: absolute; left: 10px; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('position: absolute');
    expect(result).toContain('left: 10px');
  });

  // Rule 5: Remove pixel-exact width: <n>px
  it('removes pixel-exact width declarations', () => {
    const input = '.box { width: 300px; color: blue; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('width: 300px');
    expect(result).toContain('color: blue');
  });

  // Rule 6: Remove pixel-exact height: <n>px
  it('removes pixel-exact height declarations', () => {
    const input = '.box { height: 200px; color: green; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('height: 200px');
    expect(result).toContain('color: green');
  });

  // Rule 7: Remove display: none
  it('removes display: none declarations', () => {
    const input = '.hidden { display: none; } .visible { display: block; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('display: none');
    expect(result).toContain('display: block');
  });

  // Rule 8: Remove z-index values > 999
  it('removes z-index values greater than 999', () => {
    const input = '.modal { z-index: 9999; color: red; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('z-index: 9999');
    expect(result).toContain('color: red');
  });

  it('removes z-index: 1000', () => {
    const input = '.el { z-index: 1000; }';
    const result = sanitizeCSS(input);
    expect(result).not.toContain('z-index: 1000');
  });

  // Safe values that must pass through unchanged

  it('preserves position: relative', () => {
    const input = '.el { position: relative; }';
    expect(sanitizeCSS(input)).toContain('position: relative');
  });

  it('preserves position: sticky', () => {
    const input = '.el { position: sticky; top: 0; }';
    expect(sanitizeCSS(input)).toContain('position: sticky');
  });

  it('preserves display: flex', () => {
    const input = '.el { display: flex; }';
    expect(sanitizeCSS(input)).toContain('display: flex');
  });

  it('preserves display: grid', () => {
    const input = '.el { display: grid; }';
    expect(sanitizeCSS(input)).toContain('display: grid');
  });

  it('preserves z-index: 10', () => {
    const input = '.el { z-index: 10; }';
    expect(sanitizeCSS(input)).toContain('z-index: 10');
  });

  it('preserves z-index: 999', () => {
    const input = '.el { z-index: 999; }';
    expect(sanitizeCSS(input)).toContain('z-index: 999');
  });

  it('preserves width: 100%', () => {
    const input = '.el { width: 100%; }';
    expect(sanitizeCSS(input)).toContain('width: 100%');
  });

  it('preserves width: auto', () => {
    const input = '.el { width: auto; }';
    expect(sanitizeCSS(input)).toContain('width: auto');
  });

  it('preserves border shorthand with pixel value (not a width/height property)', () => {
    const input = '.el { border: 1px solid red; }';
    const result = sanitizeCSS(input);
    expect(result).toContain('border: 1px solid red');
  });

  it('preserves height: 50vh', () => {
    const input = '.el { height: 50vh; }';
    expect(sanitizeCSS(input)).toContain('height: 50vh');
  });
});
