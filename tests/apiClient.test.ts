import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCSS, validateOpenAIKey } from '../lib/apiClient';

vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn() }));
vi.mock('openai', () => ({ default: vi.fn() }));

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const MockAnthropic = vi.mocked(Anthropic);
const MockOpenAI = vi.mocked(OpenAI);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateCSS', () => {
  it('Anthropic path calls messages.create', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'body { color: red; }' }],
    });
    MockAnthropic.mockImplementation(function (this: unknown) {
      (this as { messages: { create: typeof mockCreate } }).messages = { create: mockCreate };
    } as never);

    const result = await generateCSS('prompt', 'key', 'anthropic', 'claude-sonnet-4-6');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 4096 }),
    );
    expect(result).toBe('body { color: red; }');
  });

  it('OpenAI path calls chat.completions.create', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'body { color: blue; }' } }],
    });
    MockOpenAI.mockImplementation(function (this: unknown) {
      (this as { chat: { completions: { create: typeof mockCreate } } }).chat = {
        completions: { create: mockCreate },
      };
    } as never);

    const result = await generateCSS('prompt', 'key', 'openai', 'gpt-4o');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 4096 }),
    );
    expect(result).toBe('body { color: blue; }');
  });

  it('Markdown fences stripped', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '```css\nbody { color: red; }\n```' }],
    });
    MockAnthropic.mockImplementation(function (this: unknown) {
      (this as { messages: { create: typeof mockCreate } }).messages = { create: mockCreate };
    } as never);

    const result = await generateCSS('prompt', 'key', 'anthropic', 'claude-sonnet-4-6');
    expect(result).toBe('body { color: red; }');
  });

  it('Fences stripped without language tag', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '```\nbody {}\n```' }],
    });
    MockAnthropic.mockImplementation(function (this: unknown) {
      (this as { messages: { create: typeof mockCreate } }).messages = { create: mockCreate };
    } as never);

    const result = await generateCSS('prompt', 'key', 'anthropic', 'claude-sonnet-4-6');
    expect(result).toBe('body {}');
  });

  it('Raw CSS returned unchanged when no fences', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'body { color: red; }' }],
    });
    MockAnthropic.mockImplementation(function (this: unknown) {
      (this as { messages: { create: typeof mockCreate } }).messages = { create: mockCreate };
    } as never);

    const result = await generateCSS('prompt', 'key', 'anthropic', 'claude-sonnet-4-6');
    expect(result).toBe('body { color: red; }');
  });
});

describe('validateOpenAIKey', () => {
  it('Returns true on success', async () => {
    const mockList = vi.fn().mockResolvedValue({});
    MockOpenAI.mockImplementation(function (this: unknown) {
      (this as { models: { list: typeof mockList } }).models = { list: mockList };
    } as never);

    const result = await validateOpenAIKey('valid-key');
    expect(result).toBe(true);
  });

  it('Returns false on error', async () => {
    const mockList = vi.fn().mockRejectedValue(new Error('Unauthorized'));
    MockOpenAI.mockImplementation(function (this: unknown) {
      (this as { models: { list: typeof mockList } }).models = { list: mockList };
    } as never);

    const result = await validateOpenAIKey('invalid-key');
    expect(result).toBe(false);
  });
});
