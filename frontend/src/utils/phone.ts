export const normalizeNepalPhone = (raw: string): string =>
  raw.replace(/[\s\-()]/g, '').replace(/^\+977/, '').replace(/^0/, '');

export const isValidNepalPhone = (raw: string): boolean => /^9[6-8]\d{8}$/.test(normalizeNepalPhone(raw));
