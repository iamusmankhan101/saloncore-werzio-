import { getInvoices } from "./invoices";
import { getCurrentUser, userKey } from "./auth";

const NOTIFIED_BASE = "werzio_invoice_notified";

function getNotified(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(userKey(NOTIFIED_BASE)) || "{}"); } catch { return {}; }
}

/** Sends email for any due/overdue invoices not yet notified today. */
export async function checkInvoiceNotifications(): Promise<void> {
  if (typeof window === "undefined") return;
  const user = getCurrentUser();
  if (!user?.email) return;

  const today = new Date().toISOString().slice(0, 10);
  const notified = getNotified();

  const invoices = getInvoices().filter(
    (inv) => inv.userId === user.id && (inv.status === "overdue" || inv.status === "unpaid"),
  );

  for (const inv of invoices) {
    const key = `${inv.id}_${today}`;
    if (notified[key]) continue; // already emailed today

    // Only notify on or after the due date
    if (today < inv.dueDate) continue;

    try {
      await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: inv.userEmail,
          invoiceNumber: inv.number,
          dueDate: inv.dueDate,
          total: inv.total,
          planName: inv.planName,
          salonName: inv.salonName,
          status: inv.status,
        }),
      });
      notified[key] = today;
    } catch { /* ignore network errors */ }
  }

  localStorage.setItem(userKey(NOTIFIED_BASE), JSON.stringify(notified));
}