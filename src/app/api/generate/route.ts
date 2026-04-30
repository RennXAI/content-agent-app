import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert content creator specializing in generating high-quality, engaging content for various purposes. You understand different tones, styles, and formats for content creation.

Your capabilities include:
- Writing compelling blog posts with proper structure, headings, and engaging narratives
- Creating punchy, platform-optimized social media posts
- Drafting professional email newsletters with clear calls-to-action
- Writing persuasive product descriptions that highlight benefits
- Crafting effective ad copy that drives conversions

Always structure your output clearly, use appropriate formatting (markdown where suitable), and tailor the content to the specified tone and purpose. Focus on quality, clarity, and impact.`;

export async function POST(request: Request) {
  try {
    const { contentType, tone, topic } = await request.json();

    if (!topic?.trim()) {
      return new Response(JSON.stringify({ error: 'Topic is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userPrompt = `Generate a ${contentType} about: "${topic}"

Tone: ${tone}

Please create compelling, high-quality content that matches the specified type and tone.`;

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
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate content' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
