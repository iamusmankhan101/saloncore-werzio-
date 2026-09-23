/**
 * Behaviour that applies to one specific salon only.
 *
 * Matched on the salon name in settings because the account id isn't known
 * in code. If the salon is renamed so it no longer contains "misbah", these
 * overrides stop applying and it falls back to the normal behaviour.
 */

const MINUTE_MS = 60 * 1000;

/** How long after the invoice is created a follow-up goes out, for invoice-timed salons. */
export const INVOICE_FOLLOWUP_DELAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Misbah's salon: follow-ups are sent 24 hours after the invoice is created,
 * never from an appointment's completion or booked time. Appointment-based
 * follow-ups are dropped for this salon; every visit that is billed gets its
 * follow-up from the invoice instead.
 */
export function followupsTimedFromInvoice(settings: Record<string, unknown> | null | undefined): boolean {
  const name = (settings?.salon as { name?: unknown } | undefined)?.name;
  return typeof name === "string" && /misbah/i.test(name);
}

/** Queue ids of invoice-based follow-ups are `followup_inv_<invoice id>` (see /api/cron/followup). */
export function isInvoiceFollowupId(queueId: string): boolean {
  return queueId.startsWith("followup_inv_");
}
