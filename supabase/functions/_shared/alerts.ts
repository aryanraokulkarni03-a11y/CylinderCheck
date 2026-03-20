export function calculateNextSendAt(lastBooking?: string | null) {
  if (!lastBooking) return null

  const booking = new Date(`${lastBooking}T00:00:00+05:30`)
  if (!Number.isFinite(booking.getTime())) return null

  booking.setUTCDate(booking.getUTCDate() + 23)
  booking.setUTCHours(3, 30, 0, 0)
  return booking.toISOString()
}

export function normalizeWhatsAppNumber(input?: string | null) {
  const digits = String(input || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `91${digits}`
  if (digits.length >= 12) return digits
  return null
}

export function formatBookingReminderMessage(lastBooking?: string | null) {
  if (!lastBooking) {
    return [
      'CylinderCheck reminder',
      'Your LPG booking window is approaching.',
      'Check before you book: https://www.cylindercheck.in/track',
    ].join('\n')
  }

  return [
    'CylinderCheck reminder',
    'Your next LPG booking date is 2 days away.',
    `Last booking date: ${lastBooking}`,
    'Check your area before you book: https://www.cylindercheck.in/track',
  ].join('\n')
}
