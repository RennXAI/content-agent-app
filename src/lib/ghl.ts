const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

type GhlScope = 'location' | 'agency';

export class GhlError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'GhlError';
  }
}

function getToken(scope: GhlScope): string {
  const token =
    scope === 'location'
      ? process.env.GHL_LOCATION_API_KEY
      : process.env.GHL_API_KEY;
  if (!token) {
    throw new Error(
      `Missing GHL token for scope "${scope}". Set ${
        scope === 'location' ? 'GHL_LOCATION_API_KEY' : 'GHL_API_KEY'
      } in .env.local.`,
    );
  }
  return token;
}

export function getLocationId(): string {
  const id = process.env.GHL_LOCATION_ID;
  if (!id) {
    throw new Error('Missing GHL_LOCATION_ID in .env.local.');
  }
  return id;
}

export interface GhlRequestOptions extends Omit<RequestInit, 'headers' | 'body'> {
  scope?: GhlScope;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function ghlFetch<T = unknown>(
  path: string,
  { scope = 'location', query, body, headers, ...init }: GhlRequestOptions = {},
): Promise<T> {
  const url = new URL(path.replace(/^\//, ''), `${GHL_BASE_URL}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken(scope)}`,
      Version: process.env.GHL_API_VERSION ?? '2021-07-28',
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new GhlError(
      `GHL ${init.method ?? 'GET'} ${path} failed: ${res.status} ${res.statusText}`,
      res.status,
      parsed ?? text,
    );
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function getLocation(locationId = getLocationId()) {
  return ghlFetch(`/locations/${locationId}`, { scope: 'location' });
}
