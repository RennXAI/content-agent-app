import { GhlError } from '@/lib/ghl';
import {
  generateCalendar,
  postToGhlSummary,
  type CalendarPost,
  type GenerateCalendarOptions,
} from '@/lib/content-calendar';
import {
  createSocialPost,
  extractPostId,
  listSocialAccounts,
  type PostType,
  type SocialAccount,
} from '@/lib/ghl-social';

const DEFAULTS: Omit<GenerateCalendarOptions, 'startDate'> = {
  brandName: 'RennXAI',
  niche: 'AI automation agency / agents for SMBs',
  brandVoice:
    'Sharp, founder-led, technical-but-accessible. Specific tactics, named tools, real numbers. No corporate fluff.',
  days: 30,
  mix: { carousel: 0.4, reel: 0.3, single: 0.3 },
  timezone: 'America/Los_Angeles',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function postTypeFor(format: CalendarPost['format']): PostType {
  return format === 'reel' ? 'reel' : 'post';
}

function pickAccountsForPost(
  format: CalendarPost['format'],
  accounts: SocialAccount[],
): SocialAccount[] {
  if (format === 'reel') {
    return accounts.filter((a) =>
      ['instagram', 'tiktok', 'tiktokBusiness', 'facebook', 'youtube'].includes(
        a.platform,
      ),
    );
  }
  if (format === 'carousel') {
    return accounts.filter((a) =>
      ['instagram', 'facebook', 'linkedin'].includes(a.platform),
    );
  }
  return accounts.filter((a) =>
    ['instagram', 'facebook', 'linkedin', 'twitter'].includes(a.platform),
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate') ?? todayIso();
    const days = Number(url.searchParams.get('days') ?? DEFAULTS.days);

    const posts = await generateCalendar({
      ...DEFAULTS,
      startDate,
      days,
    });
    return Response.json({ ok: true, count: posts.length, posts });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const startDate: string = body.startDate ?? todayIso();
    const days: number = body.days ?? DEFAULTS.days;
    const dryRun: boolean = Boolean(body.dryRun);

    const posts = await generateCalendar({
      ...DEFAULTS,
      ...body.options,
      startDate,
      days,
    });

    const accounts = await listSocialAccounts();
    if (accounts.length === 0) {
      return Response.json(
        {
          ok: false,
          error:
            'No connected social accounts found on this GHL location. Connect at least one account in GHL > Marketing > Social Planner before scheduling.',
          posts,
        },
        { status: 400 },
      );
    }

    const scheduled: Array<{
      day: number;
      date: string;
      format: string;
      accountIds: string[];
      ghlPostId?: string;
      error?: string;
      skipped?: boolean;
    }> = [];

    for (const post of posts) {
      const eligible = pickAccountsForPost(post.format, accounts);
      if (eligible.length === 0) {
        scheduled.push({
          day: post.day,
          date: post.date,
          format: post.format,
          accountIds: [],
          skipped: true,
          error: `No connected account supports ${post.format}`,
        });
        continue;
      }

      if (dryRun) {
        scheduled.push({
          day: post.day,
          date: post.date,
          format: post.format,
          accountIds: eligible.map((a) => a.id),
        });
        continue;
      }

      const userId = process.env.GHL_USER_ID;
      if (!userId) {
        scheduled.push({
          day: post.day,
          date: post.date,
          format: post.format,
          accountIds: eligible.map((a) => a.id),
          error:
            'GHL_USER_ID is not set in env. Required by GHL Social Planner POST.',
        });
        continue;
      }

      try {
        const res = await createSocialPost({
          type: postTypeFor(post.format),
          accountIds: eligible.map((a) => a.id),
          summary: postToGhlSummary(post),
          userId,
          status: 'draft',
          scheduleDate: `${post.date}T16:00:00.000Z`,
        });
        scheduled.push({
          day: post.day,
          date: post.date,
          format: post.format,
          accountIds: eligible.map((a) => a.id),
          ghlPostId: extractPostId(res),
        });
      } catch (err) {
        const message =
          err instanceof GhlError
            ? `${err.message} :: ${JSON.stringify(err.body)}`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        scheduled.push({
          day: post.day,
          date: post.date,
          format: post.format,
          accountIds: eligible.map((a) => a.id),
          error: message,
        });
      }
    }

    const failures = scheduled.filter((s) => s.error && !s.skipped).length;
    return Response.json({
      ok: failures === 0,
      generated: posts.length,
      scheduled: scheduled.filter((s) => s.ghlPostId).length,
      skipped: scheduled.filter((s) => s.skipped).length,
      failures,
      results: scheduled,
      posts,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof GhlError) {
    return Response.json(
      { ok: false, status: error.status, error: error.message, body: error.body },
      { status: 502 },
    );
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return Response.json({ ok: false, error: message }, { status: 500 });
}
