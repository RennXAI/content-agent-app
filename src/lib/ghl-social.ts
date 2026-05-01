import { ghlFetch, getLocationId } from './ghl';

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'tiktokBusiness'
  | 'youtube'
  | 'twitter'
  | 'google';

export interface SocialAccount {
  id: string;
  oauthId: string;
  profileId?: string;
  name: string;
  avatar?: string;
  platform: SocialPlatform;
  type?: string;
  isExpired?: boolean;
  deleted?: boolean;
  meta?: Record<string, unknown>;
}

interface ListAccountsResponse {
  success: boolean;
  results: { accounts: SocialAccount[]; groups: unknown[] };
}

export async function listSocialAccounts(
  locationId = getLocationId(),
): Promise<SocialAccount[]> {
  const res = await ghlFetch<ListAccountsResponse>(
    `/social-media-posting/${locationId}/accounts`,
    { scope: 'location' },
  );
  return (res.results?.accounts ?? []).filter((a) => !a.deleted && !a.isExpired);
}

export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'in_review';

export type PostType = 'post' | 'story' | 'reel';

export interface CreatePostInput {
  type: PostType;
  accountIds: string[];
  summary: string;
  userId: string;
  status?: PostStatus;
  scheduleDate?: string;
  media?: Array<{ url: string; type?: 'image' | 'video'; caption?: string }>;
  tags?: string[];
  categoryId?: string;
  followUpComment?: string;
  imageUrl?: string;
}

export interface CreatePostResponse {
  success: boolean;
  statusCode: number;
  message?: string;
  results?: {
    post?: { _id?: string; [k: string]: unknown };
    id?: string;
    postId?: string;
    [k: string]: unknown;
  };
}

export function extractPostId(res: CreatePostResponse): string | undefined {
  return res.results?.post?._id ?? res.results?.id ?? res.results?.postId;
}

export async function createSocialPost(
  input: CreatePostInput,
  locationId = getLocationId(),
): Promise<CreatePostResponse> {
  return ghlFetch<CreatePostResponse>(
    `/social-media-posting/${locationId}/posts`,
    { method: 'POST', body: input, scope: 'location' },
  );
}
