"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, CheckCircle, Pencil } from "lucide-react";
import { ADVANCE_NON_REFUNDABLE_NOTE, balanceDue, type SalonInvoice } from "@/lib/salon-invoices";
import { settingsStore } from "@/lib/settings-store";
import SalonCentralWordmark from "@/components/salon-central-wordmark";
import { fmtCurrency as fmt } from "@/lib/format";

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", {
    year: "numeric", month: "long", day: "numeric",
  });
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", jazzcash: "JazzCash", easypaisa: "EasyPaisa",
  raast: "Raast", card: "Card", bank: "Bank Transfer", "": "—",
};

const PRINT_STYLES = `
  @media print {
    body > *:not(#salon-invoice-portal) { display: none !important; }
    #salon-invoice-portal {
      display: block !important; position: fixed !important;
      inset: 0 !important; background: #fff !important;
      z-index: 99999 !important; overflow: visible !important;
    }
    .sip-overlay  { background: transparent !important; padding: 0 !important; overflow: visible !important; }
    .sip-no-print { display: none !important; }
    .sip-sheet    { border-radius: 0 !important; box-shadow: none !important; max-width: 100% !important; width: 100% !important; margin: 0 !important; }
    @page { size: A4 portrait; margin: 18mm 16mm; }
  }
`;

/**
 * 80mm roll layout for a USB/driver-attached thermal printer (Speed-X SP-200u
 * and friends), where the ESC/POS-over-TCP path doesn't apply — there is no IP
 * to send to, so the receipt goes out through the OS print driver instead.
 *
 * The sheet's own spacing is set inline, so every override here needs
 * !important to win. The A4 sheet lays its header, party details, totals and
 * footer out in side-by-side columns, which cannot survive a 72mm roll — two
 * 20mm columns break "SI-2026-0004" and "8 September 2026" mid-word — so the
 * blocks below are collapsed into a single stacked column for the receipt.
 */
const RECEIPT_PRINT_STYLES = `
  @media print {
    /*
     * "size: 80mm auto" looks right but is invalid CSS: the size property takes
     * one or two lengths, or the bare keyword auto — never a length paired with
     * auto. The whole declaration was therefore dropped and the A4 rule above
     * stayed in force, which is what printed a 72mm strip down the left edge of
     * an A4 page. Bare "auto" is the valid way to say "whatever the target sheet
     * is": on a driver-attached thermal printer that is the 80mm roll the
     * driver already knows about, at the length each receipt actually needs.
     */
    @page { size: auto; margin: 0; }
    html, body { width: 80mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
    #salon-invoice-portal { position: static !important; width: 80mm !important; }
    .sip-sheet { width: 80mm !important; max-width: 80mm !important; font-size: 11px !important; line-height: 1.35 !important; }
    /* The single padded wrapper inside the sheet — A4 margins would eat the roll. */
    .sip-sheet > div { padding: 4mm 3mm !important; }
    .sip-sheet * { font-size: 11px !important; letter-spacing: 0 !important; }
    /* Headings stay only slightly larger, so the salon name still reads first. */
    .sip-sheet h1, .sip-sheet h2 { font-size: 14px !important; }
    /* A logo eats most of a 72mm column and prints as a grey smear on thermal —
       likewise the solid-black initials circle standing in for a missing one. */
    .sip-sheet img { display: none !important; }
    .sip-sheet .sip-logo-fallback { display: none !important; }
    /* Every side-by-side block becomes one stacked column. */
    .sip-sheet .sip-head,
    .sip-sheet .sip-parties,
    .sip-sheet .sip-totals,
    .sip-sheet .sip-foot { display: block !important; margin-bottom: 8px !important; }
    .sip-sheet .sip-parties > div + div { margin-top: 8px !important; }
    /* The totals box is a fixed 280px (~74mm) pinned right on A4. */
    .sip-sheet .sip-totals-box { width: 100% !important; }
    .sip-sheet table { width: 100% !important; table-layout: fixed !important; }
    .sip-sheet td, .sip-sheet th { padding: 2px 0 !important; word-break: break-word !important; }
    /* Description needs the room; the three numeric columns do not. */
    .sip-sheet .sip-items th:not(:first-child),
    .sip-sheet .sip-items td:not(:first-child) { width: 17% !important; }
  }
`;

interface Props {
  invoice: SalonInvoice;
  salonName: string;
  salonPhone: string;
  salonEmail: string;
  salonAddress: string;
  onClose: () => void;
  onMarkPaid?: () => void;
  onEdit?: () => void;
}

export default function SalonInvoicePrint({
  invoice, salonName, salonPhone, salonEmail, salonAddress,
  onClose, onMarkPaid, onEdit,
}: Props) {
  const [mounted, setMounted]           = useState(false);
  const [thermalStatus, setThermalStatus] = useState<"idle" | "printing" | "ok" | "error">("idle");
  // Which stylesheet the next window.print() should use. Reset afterwards so the
  // browser's own Print command still produces the full-page A4 invoice.
  const [printMode, setPrintMode] = useState<"a4" | "receipt">("a4");
  const [thermalError, setThermalError]   = useState("");

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const isPaid   = invoice.status === "paid";
  const isAdvance = invoice.status === "partial";
  const logo     = (settingsStore.salon as { logo?: string }).logo || "";
  const initials = salonName.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  const printer  = settingsStore.printer as { enabled: boolean; ip: string; port: number; paperWidthMm?: number };

  async function thermalPrint() {
    if (!printer.ip) {
      setThermalError("No printer IP set. Go to Settings → Thermal Printer.");
      setThermalStatus("error");
      return;
    }
    setThermalStatus("printing");
    setThermalError("");
    try {
      const res = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printerIp: printer.ip,
          printerPort: printer.port || 9100,
          paperWidthMm: printer.paperWidthMm || 80,
          salonName,
          salonPhone,
          salonAddress,
          currency: "PKR",
          invoice,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Print failed");
      setThermalStatus("ok");
      setTimeout(() => setThermalStatus("idle"), 3000);
    } catch (e: unknown) {
      setThermalError(e instanceof Error ? e.message : "Print failed");
      setThermalStatus("error");
    }
  }

  // The <style> swap has to be committed to the DOM before the (synchronous)
  // print dialog opens, so this waits a paint rather than calling print() inline.
  function printReceipt80mm() {
    setPrintMode("receipt");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.print();
      setPrintMode("a4");
    }));
  }

  const content = (
    <div id="salon-invoice-portal">
      <style>{printMode === "receipt" ? PRINT_STYLES + RECEIPT_PRINT_STYLES : PRINT_STYLES}</style>

      <div
        className="sip-overlay"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}
      >
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Toolbar */}
          <div className="sip-no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", opacity: 0.9 }}>{invoice.number} · {invoice.clientName}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {invoice.status === "unpaid" && onMarkPaid && (
                <button onClick={e => { e.stopPropagation(); onMarkPaid(); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid #6ee7b7", background: "rgba(5,150,105,0.25)", fontSize: 12, fontWeight: 700, color: "#6ee7b7", cursor: "pointer" }}>
                  <CheckCircle size={13} /> Mark Paid
                </button>
              )}
              {printer.enabled && (
                <button onClick={thermalPrint} disabled={thermalStatus === "printing"}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.3)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: thermalStatus === "ok" ? "rgba(5,150,105,0.35)" : thermalStatus === "error" ? "rgba(220,38,38,0.35)" : "rgba(124,58,237,0.35)",
                    color: "#fff", opacity: thermalStatus === "printing" ? 0.6 : 1,
                  }}>
                  <Printer size={14} />
                  {thermalStatus === "printing" ? "Printing…" : thermalStatus === "ok" ? "Sent!" : thermalStatus === "error" ? "Failed" : "Thermal Print"}
                </button>
              )}
              {thermalStatus === "error" && thermalError && (
                <span style={{ fontSize: 11, color: "#fca5a5", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={thermalError}>
                  {thermalError}
                </span>
              )}
              {onEdit && (
                <button onClick={e => { e.stopPropagation(); onEdit(); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button onClick={printReceipt80mm}
                title="Print an 80mm roll receipt through the printer's own driver — use this for a USB thermal printer"
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "1px solid #d8d8e4", background: "#fff", color: "#4a4a6a", fontSize: 12.5, fontWeight: 750, cursor: "pointer" }}>
                <Printer size={14} /> Print 80mm Receipt
              </button>
              <button onClick={() => window.print()}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                <Printer size={14} /> Print / Save PDF
              </button>
              <button type="button" onClick={onClose} aria-label="Close invoice"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", cursor: "pointer" }}>
                <X size={16} color="#fff" />
              </button>
            </div>
          </div>

          {/* Invoice Sheet */}
          <div className="sip-sheet" style={{ background: "#fff", borderRadius: 4, boxShadow: "0 24px 80px rgba(0,0,0,0.3)", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
            <div style={{ padding: "48px 52px" }}>

              {/* ── HEADER: Company left, Logo right ── */}
              <div className="sip-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 48 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{salonName}</div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 2 }}>
                    {salonAddress && <div>{salonAddress}</div>}
                    {salonEmail   && <div>{salonEmail}</div>}
                    {salonPhone   && <div>{salonPhone}</div>}
                  </div>
                </div>

                {/* Logo */}
                {logo ? (
                  <img src={logo} alt={salonName} style={{ height: 90, maxWidth: 160, objectFit: "contain" }} />
                ) : (
                  <div className="sip-logo-fallback" style={{ width: 90, height: 90, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>{initials}</span>
                  </div>
                )}
              </div>

              {/* ── BILL TO / INVOICE ── */}
              <div className="sip-parties" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 40 }}>
                {/* Bill To */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Bill To</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 4 }}>{invoice.clientName}</div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.9 }}>
                    {invoice.clientPhone && <div>{invoice.clientPhone}</div>}
                    {invoice.clientEmail && <div>{invoice.clientEmail}</div>}
                  </div>
                </div>

                {/* Invoice details */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Invoice</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <tbody>
                      {[
                        ["Invoice No:", invoice.number],
                        ["Issue Date:", fmtDate(invoice.date)],
                        ...(invoice.staffName ? [["Stylist:", invoice.staffName]] : []),
                        ["Payment:", METHOD_LABELS[invoice.paymentMethod ?? ""] ?? "—"],
                        ["Status:", isPaid ? "PAID" : isAdvance ? "ADVANCE PAID" : "UNPAID"],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td style={{ padding: "3px 0", color: "#555", width: "45%" }}>{label}</td>
                          <td style={{ padding: "3px 0", color: "#111", fontWeight: 600, textAlign: "right" }}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── ITEMS TABLE ── */}
              <table className="sip-items" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 28 }}>
                <thead>
                  <tr style={{ background: "#f0f0f0", borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc" }}>
                    {["Description", "Qty", "Unit Price", "Amount"].map((h, i) => (
                      <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#111", textTransform: "capitalize", letterSpacing: "0.03em", textAlign: i === 0 ? "left" : "right", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #e8e8e8" }}>
                      <td style={{ padding: "11px 12px", fontSize: 12, color: "#111" }}>{item.description}</td>
                      <td style={{ padding: "11px 12px", fontSize: 12, color: "#555", textAlign: "right" }}>{item.qty}</td>
                      <td style={{ padding: "11px 12px", fontSize: 12, color: "#555", textAlign: "right" }}>{fmt(item.unitPrice)}</td>
                      <td style={{ padding: "11px 12px", fontSize: 12, color: "#111", fontWeight: 600, textAlign: "right" }}>{fmt(item.total)}</td>
                    </tr>
                  ))}
                  {invoice.items.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#aaa" }}>No items</td></tr>
                  )}
                </tbody>
              </table>

              {/* ── TOTALS ── */}
              <div className="sip-totals" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 40 }}>
                <div className="sip-totals-box" style={{ width: 280 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#555", borderBottom: "1px solid #e8e8e8" }}>
                    <span style={{ fontWeight: 600 }}>Subtotal</span><span style={{ fontWeight: 700, color: "#111" }}>{fmt(invoice.subtotal)}</span>
                  </div>
                  {invoice.taxAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#555", borderBottom: "1px solid #e8e8e8" }}>
                      <span>Tax</span><span>{fmt(invoice.taxAmount)}</span>
                    </div>
                  )}
                  {invoice.discountAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#555", borderBottom: "1px solid #e8e8e8" }}>
                      <span>Discount</span><span>−{fmt(invoice.discountAmount)}</span>
                    </div>
                  )}
                  {(invoice.discount2Amount ?? 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#555", borderBottom: "1px solid #e8e8e8" }}>
                      <span>Discount 2</span><span>−{fmt(invoice.discount2Amount!)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 14, borderTop: "2px solid #111", marginTop: 4 }}>
                    <span style={{ fontWeight: 800, color: "#111" }}>Total</span>
                    <span style={{ fontWeight: 900, color: "#111" }}>{fmt(invoice.total)}</span>
                  </div>
                  {isAdvance && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "#555" }}>
                        <span>Advance paid</span><span style={{ fontWeight: 700 }}>{fmt(invoice.advanceAmount ?? 0)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "#b45309" }}>
                        <span style={{ fontWeight: 800 }}>Balance due</span>
                        <span style={{ fontWeight: 900 }}>{fmt(balanceDue(invoice))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isAdvance && (
                <div style={{ marginBottom: 24, fontSize: 12, fontWeight: 800, color: "#b45309" }}>
                  {ADVANCE_NON_REFUNDABLE_NOTE}
                </div>
              )}

              {/* ── PAYMENT STATUS ── */}
              {isPaid && invoice.paymentMethod && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>✓ Paid via {METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}</div>
                </div>
              )}

              {/* ── NOTES ── */}
              {invoice.notes && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Notes</div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>{invoice.notes}</div>
                </div>
              )}

              {/* ── TERMS ── */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Terms</div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                  Payment is due upon receipt. Thank you for your business!<br />
                  For queries, contact us at {salonEmail || salonPhone}.
                </div>
              </div>

              {/* ── FOOTER ── */}
              <div className="sip-foot" style={{ borderTop: "1px solid #e0e0e0", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: "#555" }}>
                  Thank you for visiting <strong style={{ color: "#111" }}>{salonName}</strong>!
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#aaa" }}>Powered by</span>
                  <SalonCentralWordmark compact />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
