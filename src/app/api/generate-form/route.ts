import Anthropic from '@anthropic-ai/sdk';

type Format = 'carousel' | 'video' | 'caption' | 'story';

const VOICE = `You are the AI Social Media Manager for RennXAI — an AI-powered brand and business systems studio. Voice: direct, confident, practical, systems-minded. Specific tactics over generic advice. Real numbers and named tools when relevant. Avoid therapy jargon, inspirational fluff, and victim narratives. Always end with one specific CTA.`;

function buildPrompt(args: {
  format: Format;
  pillar: string;
  platform: string;
  cta: string;
  topic: string;
  context?: string;
}): string {
  const { format, pillar, platform, cta, topic, context } = args;
  const head = `${VOICE}\n\nPillar: ${pillar}\nPlatform: ${platform}\nCTA: ${cta}\nTopic: "${topic}"${context ? `\nExtra context: ${context}` : ''}\n\n`;

  if (format === 'carousel') {
    return (
      head +
      `Produce a 10-slide Instagram carousel for RennXAI mapped to this 10-page Canva template structure:\nSlide 1 hook + promise · Slide 2 problem · Slide 3 why obvious approach fails · Slides 4-7 four specific points · Slide 8 quick win · Slide 9 bigger transformation · Slide 10 CTA.\n\nReturn EXACTLY in this format (no preamble, no closing):\nSLIDE 1 HEADLINE: <max 8 words>\nSLIDE 1 BODY: <1-2 sentences, under 240 chars>\nSLIDE 2 HEADLINE: ...\nSLIDE 2 BODY: ...\n...\nSLIDE 10 HEADLINE: ...\nSLIDE 10 BODY: ...\n\nCaption: <80-200 word IG caption, founder voice, ends with: ${cta}>\nHashtags: <10-14 mixed branded/niche/broad, space-separated, each starting with #>`
    );
  }

  if (format === 'video') {
    return (
      head +
      `Write a 30-45s vertical video script for ${platform} mapped to a 6-page Canva reel template:\nBeat 1 stop-scroll hook · Beat 2 misframe · Beat 3 reframe · Beat 4 principle/system · Beat 5 proof · Beat 6 CTA.\n\nReturn EXACTLY in this format:\nHOOK (0-3s): <stop-scroll line, max 12 words>\nBEAT 2 (3-8s): <misframe>\nBEAT 3 (8-15s): <reframe>\nBEAT 4 (15-25s): <principle/system>\nBEAT 5 (25-35s): <proof or example>\nCTA (35-45s): <single line ending with: ${cta}>\n\nCaption: <60-140 word ${platform}-optimized caption ending with: ${cta}>\nHashtags: <8-12 hashtags, space-separated>`
    );
  }

  if (format === 'caption') {
    return (
      head +
      `Write a single ${platform} caption for RennXAI.\n\nFormat exactly:\nHOOK: <line 1 — stops the scroll>\nTRUTH: <2-4 lines — the real situation>\nVALUE: <3-5 lines — what RennXAI does and how it helps>\nCTA: <1 line — ${cta}>\n\nHashtags: <8-12 hashtags, space-separated>`
    );
  }

  return (
    head +
    `Write a 5-frame Instagram Story sequence for RennXAI.\n\nFormat exactly:\nFRAME 1 HOOK: <bold statement>\nFRAME 2 PROBLEM: <name the pain>\nFRAME 3 INSIGHT: <key truth or system>\nFRAME 4 PROOF: <result or evidence>\nFRAME 5 CTA: <${cta}>`
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<{
      format: Format;
      pillar: string;
      platform: string;
      cta: string;
      topic: string;
      context: string;
    }>;
    if (!body.topic?.trim()) {
      return Response.json({ error: 'Topic is required' }, { status: 400 });
    }
    const prompt = buildPrompt({
      format: (body.format ?? 'carousel') as Format,
      pillar: body.pillar ?? 'AI Systems',
      platform: body.platform ?? 'Instagram',
      cta: body.cta ?? 'Bio link — freebie',
      topic: body.topic,
      context: body.context,
    });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }],
    });
    const final = await stream.finalMessage();
    const text = final.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    return Response.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
