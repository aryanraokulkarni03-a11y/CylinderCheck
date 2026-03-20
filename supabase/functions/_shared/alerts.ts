export function calculateNextSendAt(lastBooking?: string | null) {
  if (!lastBooking) return null

  const booking = new Date(`${lastBooking}T00:00:00+05:30`)
  if (!Number.isFinite(booking.getTime())) return null

  booking.setUTCDate(booking.getUTCDate() + 23)
  booking.setUTCHours(3, 30, 0, 0)
  return booking.toISOString()
}

export function normalizeReminderEmail(input?: string | null) {
  const email = String(input || '').trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function formatBookingReminderEmail(lastBooking?: string | null) {
  const subject = 'CylinderCheck reminder: your next LPG booking date is close'
  const intro = lastBooking
    ? `Your next LPG booking date is 2 days away. Last booking date: ${lastBooking}.`
    : 'Your LPG booking window is approaching.'

  return {
    subject,
    text: [
      'CylinderCheck reminder',
      '',
      intro,
      '',
      'Check your area before you book: https://www.cylindercheck.in/track',
      '',
      'CylinderCheck',
    ].join('\n'),
    html: `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4efe6;color:#1f1712;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf7ef;border:1px solid #e6d8c4;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px;border-bottom:1px solid #eadbc8;">
                <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;">CylinderCheck reminder</div>
                <h1 style="margin:14px 0 10px;font-size:30px;line-height:1.1;color:#201610;">Your next LPG booking date is close.</h1>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#5d4737;">${intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#5d4737;">
                  Check local delivery timing, shortage pressure, and the next sensible booking date before you place the refill.
                </p>
                <a href="https://www.cylindercheck.in/track" style="display:inline-block;padding:14px 18px;border-radius:14px;background:#f18b1f;color:#201610;text-decoration:none;font-weight:700;">
                  Check before you book
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim(),
  }
}
