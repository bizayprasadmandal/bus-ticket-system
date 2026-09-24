/**
 * Resolve a stored upload path into a usable image URL.
 * - Absolute http(s), blob:, and data: URLs pass through unchanged.
 * - Relative /uploads/... paths are prefixed with the API origin when
 *   VITE_API_URL is absolute (production static frontend); otherwise left
 *   relative so the Vite dev proxy can serve them.
 */
export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  const api = import.meta.env.VITE_API_URL || '';
  if (api && /^https?:/i.test(api)) {
    try {
      return new URL(url, api).toString();
    } catch {
      return url;
    }
  }
  return url;
}
