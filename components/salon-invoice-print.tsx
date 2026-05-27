"use client";

/**
 * SalonInvoicePrint
 * Beautiful branded A4 invoice for salon clients.
 * Triggered via window.print() — uses @media print CSS to isolate the sheet.
 */

import { X, Printer, CheckCircle } from "lucide-react";
import type { SalonInvoice } from "@/lib/salon-invoices";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number): string {
  return "PKR " + Math.round(n).toLocaleString("en-PK");
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", {
    year: "numeric", month: "long", day: "numeric",
  });
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  raast: "Raast",
  card: "Card",
  bank: "Bank Transfer",
  "": "—",
};

const STATUS_STYLE = {
  paid:   { color: "#059669", bg: "#ecfdf5", border: "#6ee7b7", label: "PAID" },
  unpaid: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "UNPAID" },
};

// ─── Salon Logo (initials-based, branded) ─────────────────────────────────────

function SalonLogo({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `linear-gradient(135deg, #5B21B6, #9333EA)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{initials}</span>
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.3px" }}>{name}</div>
        <div style={{ fontSize: 11, color: "#9898b0", fontWeight: 500, marginTop: 1 }}>Beauty &amp; Wellness</div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  invoice: SalonInvoice;
  salonName: string;
  salonPhone: string;
  salonEmail: string;
  salonAddress: string;
  onClose: () => void;
  onMarkPaid?: () => void;
}

export default function SalonInvoicePrint({
  invoice, salonName, salonPhone, salonEmail, salonAddress,
  onClose, onMarkPaid,
}: Props) {
  const st = STATUS_STYLE[invoice.status];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 300,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "24px 16px", overflowY: "auto",
      }}
    >
      {/* ── Print isolation styles ── */}
      <style>{`
        @media print {
          body > *:not(#salon-invoice-root) { display: none !important; }
          #salon-invoice-root {
            position: fixed; inset: 0;
            background: #fff; z-index: 9999;
            padding: 0; margin: 0;
            display: flex; align-items: flex-start; justify-content: center;
            overflow: visible;
          }
          .no-print { display: none !important; }
          .invoice-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div
        id="salon-invoice-root"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 12 }}
      >
        {/* ── Toolbar ── */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", opacity: 0.9 }}>
            {invoice.number} · {invoice.clientName}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {invoice.status === "unpaid" && onMarkPaid && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkPaid(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 9,
                  border: "1px solid #6ee7b7",
                  background: "rgba(5,150,105,0.25)",
                  fontSize: 12, fontWeight: 700, color: "#6ee7b7", cursor: "pointer",
                }}
              >
                <CheckCircle size={13} /> Mark Paid
              </button>
            )}
            <button
              onClick={() => window.print()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.15)",
                fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
              }}
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.15)", cursor: "pointer",
              }}
            >
              <X size={16} color="#fff" />
            </button>
          </div>
        </div>

        {/* ── Invoice Sheet ── */}
        <div
          className="invoice-sheet"
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}
        >
          {/* Top gradient bar */}
          <div style={{ height: 6, background: "linear-gradient(90deg,#5B21B6,#9333EA,#ec4899)" }} />

          <div style={{ padding: "40px 48px" }}>

            {/* ── Header row ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
              {/* Left: salon identity */}
              <div>
                <SalonLogo name={salonName} />
                <div style={{ marginTop: 10, fontSize: 12, color: "#9898b0", lineHeight: 1.8 }}>
                  {salonAddress && <>{salonAddress}<br /></>}
                  {salonPhone && <>{salonPhone}<br /></>}
                  {salonEmail}
                </div>
              </div>
              {/* Right: INVOICE + number + status */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.5px" }}>INVOICE</div>
                <div style={{ fontSize: 14, color: "#7C3AED", fontWeight: 700, marginTop: 4 }}>{invoice.number}</div>
                <div style={{ marginTop: 12, fontSize: 12, color: "#6b6b8a" }}>
                  Date: <strong style={{ color: "#1a1a2e" }}>{fmtDate(invoice.date)}</strong>
                </div>
                <div style={{
                  marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 14px", borderRadius: 20,
                  background: st.bg, border: `1px solid ${st.border}`,
                  fontSize: 12, fontWeight: 800, color: st.color, letterSpacing: "0.06em",
                }}>
                  {st.label}
                </div>
              </div>
            </div>

            {/* ── Client & Staff info ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
              {/* Bill To */}
              <div style={{ padding: "18px 20px", borderRadius: 12, border: "2px solid #EDE9FE", background: "#faf8ff" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Bill To</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e", marginBottom: 4 }}>{invoice.clientName}</div>
                <div style={{ fontSize: 12, color: "#6b6b8a", lineHeight: 1.8 }}>
                  {invoice.clientPhone && <>{invoice.clientPhone}<br /></>}
                  {invoice.clientEmail}
                </div>
              </div>
              {/* Service Details */}
              <div style={{ padding: "18px 20px", borderRadius: 12, border: "1px solid #ebebf0", background: "#fafafd" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Service Details</div>
                <div style={{ fontSize: 12, color: "#6b6b8a", lineHeight: 2 }}>
                  <div>
                    <span style={{ color: "#9898b0" }}>Stylist: </span>
                    <strong style={{ color: "#1a1a2e" }}>{invoice.staffName || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#9898b0" }}>Payment: </span>
                    <strong style={{ color: "#1a1a2e" }}>{METHOD_LABELS[invoice.paymentMethod] ?? "—"}</strong>
                  </div>
                  {invoice.appointmentId && (
                    <div>
                      <span style={{ color: "#9898b0" }}>Appt Ref: </span>
                      <strong style={{ color: "#1a1a2e" }}>#{invoice.appointmentId.slice(0, 8).toUpperCase()}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Items table ── */}
            <div style={{ marginBottom: 28 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(135deg,#5B21B6,#9333EA)" }}>
                    {["#", "Description", "Type", "Qty", "Unit Price", "Total"].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: "11px 14px",
                          fontSize: 10, fontWeight: 800, color: "#fff",
                          textTransform: "uppercase", letterSpacing: "0.07em",
                          textAlign: i < 3 ? "left" : "right",
                          borderRadius: i === 0 ? "8px 0 0 8px" : i === 5 ? "0 8px 8px 0" : 0,
                          whiteSpace: "nowrap",
                        }}
                      >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, i) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f8", background: i % 2 === 0 ? "#fff" : "#fafafd" }}>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#9898b0", fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#1a1a2e", fontWeight: 600 }}>{item.description}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          display: "inline-flex", padding: "2px 8px", borderRadius: 20,
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                          background: item.type === "service" ? "#EDE9FE" : "#fef9ec",
                          color: item.type === "service" ? "#7C3AED" : "#d97706",
                        }}>
                          {item.type === "service" ? "Service" : "Product"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#6b6b8a", textAlign: "right" }}>{item.qty}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#6b6b8a", textAlign: "right" }}>{fmt(item.unitPrice)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#1a1a2e", textAlign: "right" }}>{fmt(item.total)}</td>
                    </tr>
                  ))}
                  {invoice.items.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "#b0b0c8" }}>No items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Totals ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
              <div style={{ width: 300 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f8", fontSize: 13, color: "#6b6b8a" }}>
                  <span>Subtotal</span><span style={{ fontWeight: 600, color: "#1a1a2e" }}>{fmt(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f8", fontSize: 13, color: "#059669" }}>
                    <span>Discount</span><span style={{ fontWeight: 600 }}>− {fmt(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.taxAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f8", fontSize: 13, color: "#6b6b8a" }}>
                    <span>Tax</span><span style={{ fontWeight: 600, color: "#1a1a2e" }}>{fmt(invoice.taxAmount)}</span>
                  </div>
                )}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "13px 16px", marginTop: 10,
                  background: "linear-gradient(135deg,#5B21B6,#9333EA)", borderRadius: 12,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Total</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{fmt(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* ── Notes ── */}
            {invoice.notes && (
              <div style={{ marginBottom: 28, padding: "14px 18px", borderRadius: 10, background: "#f8f8fc", border: "1px solid #ebebf0" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Notes</div>
                <div style={{ fontSize: 13, color: "#4a4a6a", lineHeight: 1.6 }}>{invoice.notes}</div>
              </div>
            )}

            {/* ── Footer ── */}
            <div style={{ textAlign: "center", paddingTop: 20, borderTop: "1px solid #f0f0f8" }}>
              <div style={{ fontSize: 12, color: "#9898b0", lineHeight: 1.8 }}>
                Thank you for visiting <strong style={{ color: "#7C3AED" }}>{salonName}</strong>! We look forward to seeing you again.
                {salonPhone && <><br />{salonPhone}</>}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ height: 4, background: "linear-gradient(90deg,#5B21B6,#9333EA,#ec4899)" }} />
        </div>
      </div>
    </div>
  );
}