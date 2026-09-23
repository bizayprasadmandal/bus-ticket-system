import type { User } from '../types';

export function getHomePath(user: User | null): string {
  if (!user) return '/login';
  const roles = user.roles?.map((r) => r.role) || [];
  if (roles.includes('SUPER_ADMIN')) return '/admin';
  if (roles.includes('OPERATOR')) return '/operator';
  if (roles.includes('DISPATCHER')) return '/dispatcher';
  if (roles.includes('DRIVER')) return '/driver';
  if (roles.includes('CONDUCTOR')) return '/conductor';
  if (roles.includes('COUNTER_AGENT')) return '/counter';
  return '/';
}

export function getBookAnotherPath(user: User | null): string {
  const home = getHomePath(user);
  if (home === '/counter') return '/counter/book';
  return home;
}

export function getMyBookingsPath(user: User | null): string {
  const home = getHomePath(user);
  if (home === '/counter') return '/counter/bookings';
  if (home === '/') return '/my-bookings';
  return home;
}
