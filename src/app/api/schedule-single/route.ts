import { GhlError } from '@/lib/ghl';
import {
  createSocialPost,
  listSocialAccounts,
  type PostType,
  type SocialAccount,
} from '@/lib/ghl-social';

type Format = 'carousel' | 'reel' | 'single';

function pickAccountsForPost(format: Format, accounts: SocialAccount[]): SocialAccount[] {
  if (format === 'reel') {
    return accounts.filter((a) =>
      ['instagram', 'tiktok', 'tiktokBusiness', 'facebook', 'youtube'].includes(a.platform),
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

function postTypeFor(format: Format): PostType {
  return format === 'reel' ? 'reel' : 'post';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<{
      summary: string;
      format: Format;
      scheduleDate: string;
      title: string;
    }>;
    if (!body.summary?.trim()) {
      return Response.json({ ok: false, error: 'summary is required' }, { status: 400 });
    }

    const format: Format = body.format ?? 'single';
    const userId = process.env.GHL_USER_ID;
    if (!userId) {
      return Response.json(
        {
          ok: false,
          error:
            'GHL_USER_ID is not configured. Find it via GHL > Settings > My Staff > click your user; the URL contains the userId.',
        },
        { status: 412 },
      );
    }

    const accounts = await listSocialAccounts();
    const eligible = pickAccountsForPost(format, accounts);
    if (eligible.length === 0) {
      return Response.json(
        {
          ok: true,
          skipped: true,
          reason: `No connected GHL social account supports ${format}.`,
          connectedPlatforms: accounts.map((a) => a.platform),
        },
        { status: 200 },
      );
    }

    const res = await createSocialPost({
      type: postTypeFor(format),
      accountIds: eligible.map((a) => a.id),
      summary: body.summary,
      userId,
      status: 'draft',
      scheduleDate: body.scheduleDate,
    });
    return Response.json({
      ok: true,
      ghlPostId: res.results?.id ?? res.results?.postId,
      accountIds: eligible.map((a) => a.id),
    });
  } catch (error) {
    if (error instanceof GhlError) {
      return Response.json(
        { ok: false, status: error.status, error: error.message, body: error.body },
        { status: 502 },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
