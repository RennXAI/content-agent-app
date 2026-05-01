import { GhlError, getLocation, getLocationId } from '@/lib/ghl';

export async function GET() {
  try {
    const locationId = getLocationId();
    const location = await getLocation(locationId);
    return Response.json({ ok: true, locationId, location });
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
