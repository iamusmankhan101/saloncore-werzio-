// ─── Service upsell ───────────────────────────────────────────────────────────
// What a stylist sold on top of what the client actually booked — the facial
// added to a cut-and-blow-dry at the chair, not the cut itself.
//
// There is no "upsold" flag anywhere, and there doesn't need to be: the booking
// says what was agreed in advance and the invoice says what was paid for, and
// POS never writes the cart back onto the appointment, so the two stay
// independent records. Anything on the bill that isn't on the booking was sold
// during the visit.
//
// Only appointment-linked sales can be measured. A walk-in booked nothing, so
// nothing about the sale is "extra" — counting it would pay an upsell rate on
// ordinary counter trade.

import type { Appointment, Service } from "./types";
import type { SalonInvoice, SalonInvoiceItem } from "./salon-invoices";

export interface UpsellLine {
  invoiceNumber: string;
  date: string;
  serviceName: string;
  qty: number;
  /** The staff member's share of what the client paid for it, after discounts. */
  amount: number;
}

export interface UpsellSummary {
  /** Total upsold value credited to this staff member in the period. */
  value: number;
  /** The individual sales behind it, newest first. */
  lines: UpsellLine[];
}

/**
 * How many of each service the appointment booked.
 *
 * Keyed by id where the booking has one and by lower-cased name as well, since
 * an invoice line written before `sourceId` existed — or typed by hand at the
 * counter — can only be matched on its description.
 */
function bookedCounts(appt: Appointment): { byId: Map<string, number>; byName: Map<string, number> } {
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const id of appt.serviceIds) byId.set(id, (byId.get(id) ?? 0) + 1);
  for (const name of appt.serviceNames) {
    const key = name.trim().toLowerCase();
    if (key) byName.set(key, (byName.get(key) ?? 0) + 1);
  }
  return { byId, byName };
}

/**
 * How many units of one invoice line were sold beyond the booking.
 *
 * A booked service rung up twice is one booked and one upsold, so this works in
 * units rather than treating the whole line as booked or not. The count is
 * decremented as it is consumed, so two separate lines for the same booked
 * service don't each claim the same booking.
 */
function upsoldUnits(line: SalonInvoiceItem, booked: ReturnType<typeof bookedCounts>): number {
  const qty = Math.max(1, line.qty);
  const nameKey = line.description.trim().toLowerCase();

  let allowance = 0;
  if (line.sourceId && booked.byId.has(line.sourceId)) {
    allowance = booked.byId.get(line.sourceId)!;
    booked.byId.set(line.sourceId, Math.max(0, allowance - qty));
  } else if (booked.byName.has(nameKey)) {
    allowance = booked.byName.get(nameKey)!;
    booked.byName.set(nameKey, Math.max(0, allowance - qty));
  }
  return Math.max(0, qty - allowance);
}

/**
 * What the client actually paid per rupee of listed price.
 *
 * Invoice discounts are applied to the bill as a whole, not to any one line, so
 * an upsell's share of them has to be pro-rated. Without this an upsold service
 * would earn its incentive on a price the client never paid — and on a heavily
 * discounted bill that gap is the whole margin.
 */
function paidRatio(invoice: SalonInvoice): number {
  const listed = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
  if (listed <= 0) return 1;
  return Math.min(1, invoice.total / listed);
}

/**
 * Who to credit an upsold line to, and what share each gets.
 *
 * Mirrors staffRevenueFromAppointment in lib/payouts.ts: a service flagged
 * multiStylist is worked by the whole assigned team, so its upsell is split
 * between them rather than going to whoever happened to be on the booking.
 */
function creditShare(line: SalonInvoiceItem, appt: Appointment, staffId: string, services: Service[]): number {
  const service = line.sourceId
    ? services.find((s) => s.id === line.sourceId)
    : services.find((s) => s.name.trim().toLowerCase() === line.description.trim().toLowerCase());

  if (service?.multiStylist && service.assignedStaffIds.length >= 2) {
    return service.assignedStaffIds.includes(staffId) ? 1 / service.assignedStaffIds.length : 0;
  }
  return appt.staffId === staffId ? 1 : 0;
}

/**
 * Services this staff member sold beyond the booking, across [start, end].
 *
 * Dated by the invoice rather than the appointment: the incentive is earned when
 * the sale is made, which is also the period the commission on it falls into.
 */
export function upsellInPeriod(
  staffId: string,
  invoices: SalonInvoice[],
  appointments: Appointment[],
  services: Service[],
  start: string,
  end: string,
): UpsellSummary {
  const apptById = new Map(appointments.map((a) => [a.id, a]));
  const lines: UpsellLine[] = [];

  for (const invoice of invoices) {
    if (!invoice.appointmentId) continue;
    if (invoice.date < start || invoice.date > end) continue;
    const appt = apptById.get(invoice.appointmentId);
    if (!appt) continue;

    const booked = bookedCounts(appt);
    const ratio = paidRatio(invoice);

    for (const line of invoice.items) {
      if (line.type !== "service") continue;
      // Consumed for every line, upsold or not, so the booking allowance is
      // spent in order rather than being re-offered to a later line.
      const units = upsoldUnits(line, booked);
      if (units <= 0) continue;

      const share = creditShare(line, appt, staffId, services);
      if (share <= 0) continue;

      const amount = (line.unitPrice || 0) * units * ratio * share;
      if (amount <= 0) continue;
      lines.push({
        invoiceNumber: invoice.number,
        date: invoice.date,
        serviceName: line.description,
        qty: units,
        amount: Math.round(amount),
      });
    }
  }

  lines.sort((a, b) => b.date.localeCompare(a.date));
  return { value: lines.reduce((sum, l) => sum + l.amount, 0), lines };
}

/**
 * Which lines of one invoice were sold beyond the booking, as a set of line ids.
 *
 * For showing the person editing an invoice what their additions are worth —
 * the same rule the payout uses, so the editor can't disagree with the payslip.
 * Everything is upsold when the sale has no appointment behind it to compare
 * against, so those return an empty set rather than flagging the whole bill.
 */
export function upsoldLineIds(invoice: SalonInvoice, appt: Appointment | undefined): Set<string> {
  if (!appt) return new Set();
  const booked = bookedCounts(appt);
  const ids = new Set<string>();
  for (const line of invoice.items) {
    if (line.type !== "service") continue;
    if (upsoldUnits(line, booked) > 0) ids.add(line.id);
  }
  return ids;
}

/** The incentive itself: upsold value × the staff member's upsell rate. */
export function upsellIncentive(value: number, ratePercent?: number): number {
  const rate = Number(ratePercent);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round(value * rate / 100);
}
