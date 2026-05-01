import Anthropic from '@anthropic-ai/sdk';

export type PostFormat = 'carousel' | 'reel' | 'single';

export interface CarouselSlide {
  headline: string;
  body: string;
}

export interface ReelBeat {
  time: string;
  visual: string;
  voiceover: string;
}

export interface CalendarPost {
  day: number;
  date: string;
  format: PostFormat;
  pillar: string;
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  visualDirection: string;
  slides?: CarouselSlide[];
  reel?: { duration: string; beats: ReelBeat[] };
}

export interface GenerateCalendarOptions {
  niche: string;
  brandName: string;
  brandVoice: string;
  startDate: string;
  days?: number;
  mix?: { carousel: number; reel: number; single: number };
  timezone?: string;
}

const DEFAULT_MIX = { carousel: 0.4, reel: 0.3, single: 0.3 };

const CONTENT_PILLARS = [
  'AI agency wins / case studies',
  'Behind-the-scenes builds',
  'Tactical AI workflows for SMBs',
  'Founder POV on agents and automation',
  'Client transformation stories',
  'Tooling deep-dives',
  'Industry trends + hot takes',
  'Lead-magnet teases / educational',
];

function buildFormatSchedule(days: number, mix = DEFAULT_MIX): PostFormat[] {
  const total = mix.carousel + mix.reel + mix.single;
  const counts = {
    carousel: Math.round((mix.carousel / total) * days),
    reel: Math.round((mix.reel / total) * days),
    single: 0,
  };
  counts.single = days - counts.carousel - counts.reel;

  const sequence: PostFormat[] = [];
  const remaining = { ...counts };
  const order: PostFormat[] = ['carousel', 'reel', 'single'];
  while (sequence.length < days) {
    for (const f of order) {
      if (remaining[f] > 0) {
        sequence.push(f);
        remaining[f]--;
        if (sequence.length === days) break;
      }
    }
  }
  return sequence;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const SYSTEM_PROMPT = `You are a senior social media strategist for an AI agency. You produce content calendars that are punchy, specific, opinionated, and action-oriented — never generic "engagement" filler. You write captions that read like a sharp founder talking to operators, not a brand bot. You always ground content in concrete tactics, named tools, real numbers, and specific scenarios. Avoid vague advice. Use plain English. No emojis unless they earn their place.`;

const POST_TOOL = {
  name: 'emit_calendar',
  description: 'Emit the structured 30-day content calendar.',
  input_schema: {
    type: 'object',
    properties: {
      posts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'integer' },
            date: { type: 'string' },
            format: { type: 'string', enum: ['carousel', 'reel', 'single'] },
            pillar: { type: 'string' },
            title: { type: 'string' },
            hook: { type: 'string' },
            caption: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            cta: { type: 'string' },
            visualDirection: { type: 'string' },
            slides: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  headline: { type: 'string' },
                  body: { type: 'string' },
                },
                required: ['headline', 'body'],
              },
            },
            reel: {
              type: 'object',
              properties: {
                duration: { type: 'string' },
                beats: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      time: { type: 'string' },
                      visual: { type: 'string' },
                      voiceover: { type: 'string' },
                    },
                    required: ['time', 'visual', 'voiceover'],
                  },
                },
              },
              required: ['duration', 'beats'],
            },
          },
          required: [
            'day',
            'date',
            'format',
            'pillar',
            'title',
            'hook',
            'caption',
            'hashtags',
            'cta',
            'visualDirection',
          ],
        },
      },
    },
    required: ['posts'],
  },
} as const;

export async function generateCalendar(
  opts: GenerateCalendarOptions,
): Promise<CalendarPost[]> {
  const days = opts.days ?? 30;
  const sequence = buildFormatSchedule(days, opts.mix);
  const dailyPlan = sequence.map((format, i) => ({
    day: i + 1,
    date: addDays(opts.startDate, i),
    format,
  }));

  const userPrompt = `Brand: ${opts.brandName}
Niche: ${opts.niche}
Voice: ${opts.brandVoice}
Start date: ${opts.startDate}
Timezone: ${opts.timezone ?? 'America/Los_Angeles'}

Produce ${days} posts following this exact day/format schedule (do not deviate):
${dailyPlan.map((d) => `Day ${d.day} (${d.date}): ${d.format}`).join('\n')}

Distribute pillars across the calendar (rotate, don't cluster). Pillars to draw from:
${CONTENT_PILLARS.map((p) => `- ${p}`).join('\n')}

Format-specific requirements:
- carousel: 8 slides. Slide 1 = hook + promise. Slides 2-7 = one specific point each (numbers, named tools, before/after). Slide 8 = CTA. Keep slide bodies under 280 chars.
- reel: 30-45s vertical. Provide 6-9 beats with timestamps (e.g. "0-3s", "3-7s"). Each beat has a visual cue and a voiceover line. First beat must be a stop-scroll hook.
- single: One strong image post. Caption must lead with a hook in line 1, then deliver value in 4-7 short lines.

For every post:
- caption: 80-220 words, founder-voice, no fluff, ends with cta
- hashtags: 8-15, mix branded + niche + broad
- visualDirection: one sentence describing the visual concept (so a designer/editor can produce media)

Use the emit_calendar tool to return ALL ${days} posts in one call. Do not summarize. Do not output text outside the tool call.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    tools: [POST_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: 'tool', name: 'emit_calendar' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  );
  if (!toolUse) {
    throw new Error('Claude did not return a tool_use block for emit_calendar.');
  }
  const { posts } = toolUse.input as { posts: CalendarPost[] };
  if (!Array.isArray(posts) || posts.length !== days) {
    throw new Error(
      `Expected ${days} posts in calendar, got ${posts?.length ?? 0}.`,
    );
  }
  return posts;
}

export function postToGhlSummary(post: CalendarPost): string {
  const parts = [post.caption.trim()];
  if (post.format === 'carousel' && post.slides?.length) {
    parts.push(
      '',
      '— Carousel slides —',
      ...post.slides.map((s, i) => `${i + 1}. ${s.headline}\n   ${s.body}`),
    );
  }
  if (post.format === 'reel' && post.reel?.beats?.length) {
    parts.push(
      '',
      `— Reel script (${post.reel.duration}) —`,
      ...post.reel.beats.map(
        (b) => `${b.time} | ${b.visual}\n   VO: ${b.voiceover}`,
      ),
    );
  }
  parts.push('', `Visual: ${post.visualDirection}`);
  parts.push('', `CTA: ${post.cta}`);
  if (post.hashtags?.length) parts.push('', post.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '));
  return parts.join('\n');
}
