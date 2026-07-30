// Split out from lib/billing-db.ts (which pulls in the server-only @libsql/client)
// so client components — the salon-facing billing page, the printable invoice —
// can use this default without bundling a DB client into the browser.

/** Shown on an invoice for any salon that doesn't have a payment-detail override set. */
export const DEFAULT_BANK_DETAILS = {
  title: "TAREEZ TECH",
  accountNumber: "02291011176553",
  iban: "PK90ALFH0229001011176553",
};
