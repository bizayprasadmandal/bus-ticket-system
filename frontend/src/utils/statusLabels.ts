export function bookingStatusLabel(status: string): string {
  if (status === 'PENDING') return 'Awaiting Payment';
  if (status === 'NO_SHOW') return 'No Show';
  return status;
}

export function paymentStatusLabel(status: string): string {
  if (status === 'PENDING') return 'Awaiting Payment';
  if (status === 'COMPLETED' || status === 'PAID') return 'Paid';
  if (status === 'FAILED') return 'Failed';
  if (status === 'REFUNDED') return 'Refunded';
  return status;
}
