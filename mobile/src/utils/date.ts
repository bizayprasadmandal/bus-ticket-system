const NPT_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

// Asia/Kathmandu (UTC+5:45) formatting without relying on full ICU Intl support.
export function formatDateNPT(iso: string | Date): string {
  const d = new Date(new Date(iso).getTime() + NPT_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function formatDateTimeNPT(iso: string | Date): string {
  const d = new Date(new Date(iso).getTime() + NPT_OFFSET_MS);
  return `${formatDateNPT(iso)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
