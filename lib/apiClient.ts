import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type Provider = 'anthropic' | 'openai';

function extractCSS(raw: string): string {
  const fenceMatch = raw.match(/```(?:css)?\s*([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : raw.trim();
}

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}

export async function generateCSS(
  prompt: string,
  apiKey: string,
  provider: Provider,
  model: string,
): Promise<string> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0] as { type: string; text: string };
    return extractCSS(block.text);
  } else if (provider === 'openai') {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    return extractCSS(response.choices[0].message.content ?? '');
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
