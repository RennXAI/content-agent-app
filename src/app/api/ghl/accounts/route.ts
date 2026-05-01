import { GhlError } from '@/lib/ghl';
import { listSocialAccounts } from '@/lib/ghl-social';

export async function GET() {
  try {
    const accounts = await listSocialAccounts();
    return Response.json({ ok: true, accounts });
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
