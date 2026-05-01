export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !key.trim()) {
    throw new EnvError('ANTHROPIC_API_KEY is not set');
  }
  return key;
}
