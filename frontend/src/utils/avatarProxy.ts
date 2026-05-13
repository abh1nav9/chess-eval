import { API_BASE_URL } from '@/constants';

/** Route Chess.com CDN avatars through the API to avoid fragile CORS/referrer workarounds (analysis.md §4.15). */
export function proxiedChessComAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url || !url.startsWith('https://images.chess.com/')) {
    return url ?? undefined;
  }
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/api/v1/proxy/avatar?url=${encodeURIComponent(url)}`;
}
