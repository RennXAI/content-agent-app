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
  template?: {
    canvaDesignId: string;
    pageMap: Array<{ page: number; role: string; copy: string }>;
  };
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

Format-specific requirements (these match the RennXAI Canva templates exactly):
- carousel: EXACTLY 10 slides (mapped to a 10-page Canva template).
  - Slide 1: hook + promise (stop-scroll opener)
  - Slide 2: the problem / current pain
  - Slide 3: why the obvious approach fails
  - Slide 4-7: four specific points, one per slide (numbers, named tools, before/after, mini-frameworks)
  - Slide 8: a quick win the reader can apply today
  - Slide 9: the bigger transformation when systemized
  - Slide 10: CTA (DM, follow, link in bio)
  - Keep each slide body under 240 chars.
- reel: 30-45s vertical, EXACTLY 6 beats (mapped to a 6-page Canva reel template).
  - Beat 1: stop-scroll hook (3s)
  - Beat 2: the misframe / wrong assumption
  - Beat 3: reframe / the real problem
  - Beat 4: the principle / system
  - Beat 5: the proof or example
  - Beat 6: CTA / follow
  - Each beat: timestamp, visual cue, single voiceover line under 22 words.
- single: One strong image post. Caption must lead with a hook in line 1, then deliver value in 4-7 short lines.

For every post:
- caption: 80-220 words, founder-voice, no fluff, ends with cta
- hashtags: 8-15, mix branded + niche + broad
- visualDirection: one sentence describing the visual concept (so a designer/editor can produce media)

Use the emit_calendar tool to return ALL ${days} posts in one call. Do not summarize. Do not output text outside the tool call.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 48000,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    tools: [POST_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: 'tool', name: 'emit_calendar' },
    messages: [{ role: 'user', content: userPrompt }],
  });
  const response = await stream.finalMessage();

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
  return posts.map(attachTemplateRef);
}

const CAROUSEL_PAGE_ROLES = [
  'Hook + promise',
  'Problem / current pain',
  'Why obvious approach fails',
  'Specific point 1',
  'Specific point 2',
  'Specific point 3',
  'Specific point 4',
  'Quick win',
  'Bigger transformation',
  'CTA',
];

const REEL_PAGE_ROLES = [
  'Stop-scroll hook',
  'Misframe',
  'Reframe',
  'Principle / system',
  'Proof / example',
  'CTA',
];

function attachTemplateRef(post: CalendarPost): CalendarPost {
  if (post.format === 'carousel') {
    const tpl = process.env.CANVA_CAROUSEL_TEMPLATE_ID;
    if (!tpl || !post.slides) return post;
    const pageMap = CAROUSEL_PAGE_ROLES.map((role, i) => ({
      page: i + 1,
      role,
      copy: post.slides?.[i]
        ? `${post.slides[i].headline}\n${post.slides[i].body}`
        : '',
    }));
    return { ...post, template: { canvaDesignId: tpl, pageMap } };
  }
  if (post.format === 'reel') {
    const tpl = process.env.CANVA_REEL_TEMPLATE_ID;
    if (!tpl || !post.reel?.beats) return post;
    const pageMap = REEL_PAGE_ROLES.map((role, i) => ({
      page: i + 1,
      role,
      copy: post.reel?.beats[i]?.voiceover ?? '',
    }));
    return { ...post, template: { canvaDesignId: tpl, pageMap } };
  }
  return post;
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
