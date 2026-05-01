import Anthropic from '@anthropic-ai/sdk';
import { EnvError, getAnthropicApiKey } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are an expert content creator specializing in generating high-quality, engaging content for various purposes. You understand different tones, styles, and formats for content creation.

Your capabilities include:
- Writing compelling blog posts with proper structure, headings, and engaging narratives
- Creating punchy, platform-optimized social media posts
- Drafting professional email newsletters with clear calls-to-action
- Writing persuasive product descriptions that highlight benefits
- Crafting effective ad copy that drives conversions

Always structure your output clearly, use appropriate formatting (markdown where suitable), and tailor the content to the specified tone and purpose. Focus on quality, clarity, and impact.`;

const MAX_TOPIC_LEN = 2000;
const MAX_FIELD_LEN = 64;

type GenerateBody = {
  contentType?: unknown;
  tone?: unknown;
  topic?: unknown;
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validate(body: GenerateBody) {
  const { contentType, tone, topic } = body;
  if (typeof contentType !== 'string' || !contentType.trim()) {
    return 'contentType is required';
  }
  if (typeof tone !== 'string' || !tone.trim()) {
    return 'tone is required';
  }
  if (typeof topic !== 'string' || !topic.trim()) {
    return 'topic is required';
  }
  if (contentType.length > MAX_FIELD_LEN) return 'contentType is too long';
  if (tone.length > MAX_FIELD_LEN) return 'tone is too long';
  if (topic.length > MAX_TOPIC_LEN) return `topic must be ${MAX_TOPIC_LEN} characters or fewer`;
  return null;
}

export async function POST(request: Request) {
  let apiKey: string;
  try {
    apiKey = getAnthropicApiKey();
  } catch (err) {
    if (err instanceof EnvError) {
      return jsonError('Server is not configured: ANTHROPIC_API_KEY missing', 503);
    }
    throw err;
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const validationError = validate(body);
  if (validationError) return jsonError(validationError, 400);

  const contentType = (body.contentType as string).trim();
  const tone = (body.tone as string).trim();
  const topic = (body.topic as string).trim();

  const userPrompt = `Generate a ${contentType} about: "${topic}"

Tone: ${tone}

Please create compelling, high-quality content that matches the specified type and tone.`;

  const anthropic = new Anthropic({ apiKey });

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Generate API error:', error);
    if (error instanceof Anthropic.APIError) {
      const status = error.status ?? 500;
      const message =
        status === 401
          ? 'Invalid Anthropic API key'
          : status === 429
            ? 'Rate limit exceeded, please try again shortly'
            : 'Upstream provider error';
      return jsonError(message, status >= 400 && status < 600 ? status : 500);
    }
    return jsonError('Failed to generate content', 500);
  }
}
