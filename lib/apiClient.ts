import Anthropic from '@anthropic-ai/sdk';

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
