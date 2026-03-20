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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function formatBookingReminderEmail(lastBooking?: string | null) {
  const subject = 'CylinderCheck reminder: your next LPG booking date is close'

  const bookingDate = lastBooking
    ? new Date(`${lastBooking}T00:00:00+05:30`)
    : null
  const nextBookingDate =
    bookingDate && Number.isFinite(bookingDate.getTime())
      ? new Date(bookingDate.getTime() + 25 * 24 * 60 * 60 * 1000)
      : null

  const nextBookingLabel = nextBookingDate
    ? nextBookingDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : 'your next booking window'

  const intro = lastBooking
    ? 'We are reminding you 2 days ahead so you can check local delivery timing and shortage pressure before you book.'
    : 'Your LPG booking window is approaching.'

  const safeIntro = escapeHtml(intro)
  const safeLastBooking = lastBooking ? escapeHtml(lastBooking) : ''
  const safeNextBookingLabel = escapeHtml(nextBookingLabel)

  return {
    subject,
    text: [
      'CylinderCheck reminder',
      '',
      lastBooking
        ? `Your next LPG booking date is close. Last booking date: ${lastBooking}. Expected booking date: ${nextBookingLabel}.`
        : intro,
      '',
      'Before you book:',
      '- Check local delivery timing in your PIN.',
      '- Check whether shortage pressure is active nearby.',
      '- Book early if supply already looks tight.',
      '',
      'Check your area before you book: https://www.cylindercheck.in/track',
      '',
      'CylinderCheck by Xisch.Co',
      'Reply to: xisch.co@gmail.com',
    ].join('\n'),
    html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CylinderCheck reminder</title>
  </head>
  <body style="margin:0;padding:0;background:#f4efe6;color:#1f1712;font-family:General Sans,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fbf7ef;border:1px solid #e6d8c4;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 16px;border-bottom:1px solid #eadbc8;background:linear-gradient(180deg,#f9f1e3 0%,#fbf7ef 100%);">
                <div style="font-size:12px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;">CylinderCheck reminder</div>
                <h1 style="margin:14px 0 10px;font-family:Satoshi,Arial,sans-serif;font-size:34px;line-height:1.08;letter-spacing:-0.03em;color:#201610;font-weight:700;">
                  Your next LPG booking date is close.
                </h1>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#5d4737;">
                  ${safeIntro}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:#fffaf3;border:1px solid #eadbc8;border-radius:18px;">
                  <tr>
                    <td style="padding:18px 18px 14px;">
                      <div style="font-size:12px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;margin-bottom:10px;">Booking context</div>
                      <div style="font-family:Satoshi,Arial,sans-serif;font-size:26px;line-height:1.15;color:#201610;font-weight:600;margin-bottom:8px;">
                        ${safeNextBookingLabel}
                      </div>
                      ${
                        lastBooking
                          ? `<div style="font-size:15px;line-height:1.7;color:#5d4737;">Last booking date: <strong style="color:#201610;">${safeLastBooking}</strong></div>`
                          : `<div style="font-size:15px;line-height:1.7;color:#5d4737;">Add your latest booking date in CylinderCheck for more precise reminders.</div>`
                      }
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#5d4737;">
                  Before you place the refill, check local delivery timing, shortage pressure, and the latest tracked price in your area.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="width:50%;padding:0 8px 0 0;vertical-align:top;">
                      <div style="border:1px solid #eadbc8;border-radius:18px;background:#fffaf3;padding:16px;height:100%;box-sizing:border-box;">
                        <div style="font-size:12px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;margin-bottom:8px;">Check timing</div>
                        <div style="font-family:Satoshi,Arial,sans-serif;font-size:20px;line-height:1.2;color:#201610;font-weight:600;margin-bottom:8px;">See how long delivery is taking nearby</div>
                        <div style="font-size:14px;line-height:1.65;color:#5d4737;">Use your PIN to judge whether delivery looks normal or slow before you use the booking window.</div>
                      </div>
                    </td>
                    <td style="width:50%;padding:0 0 0 8px;vertical-align:top;">
                      <div style="border:1px solid #eadbc8;border-radius:18px;background:#fffaf3;padding:16px;height:100%;box-sizing:border-box;">
                        <div style="font-size:12px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:#8c6f55;font-weight:600;margin-bottom:8px;">Check pressure</div>
                        <div style="font-family:Satoshi,Arial,sans-serif;font-size:20px;line-height:1.2;color:#201610;font-weight:600;margin-bottom:8px;">Look for shortage pressure before it builds</div>
                        <div style="font-size:14px;line-height:1.65;color:#5d4737;">If supply already looks tight in your area, booking early is usually the safer move.</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 28px;">
                <a href="https://www.cylindercheck.in/track" style="display:inline-block;padding:14px 18px;border-radius:14px;background:#f18b1f;color:#201610;text-decoration:none;font-weight:700;">
                  Check before you book
                </a>

                <div style="border-top:1px solid #eadbc8;padding-top:18px;margin-top:18px;">
                  <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#5d4737;">
                    If this reminder reached you by mistake, reply to this email and we’ll help sort it out.
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#8c6f55;">
                    CylinderCheck by Xisch.Co<br />
                    Reply to: xisch.co@gmail.com
                  </p>
                </div>
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
