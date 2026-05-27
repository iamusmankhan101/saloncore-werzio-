"use client";

/**
 * InvoiceViewer — SaaS subscription billing invoice (Werzio → salon owner).
 * Uses a React portal so the @media print isolation selector works correctly
 * in Next.js (the portal div is a direct child of <body>).
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import type { Invoice } from "@/lib/invoices";

function fmt(n: number) { return "PKR " + n.toLocaleString("en-PK"); }
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  paid:    { color: "#059669", bg: "#ecfdf5", border: "#6ee7b7", label: "PAID"    },
  unpaid:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "UNPAID"  },
  overdue: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "OVERDUE" },
};

const PRINT_STYLES = `
  @media print {
    body > *:not(#werzio-invoice-portal) { display: none !important; }
    #werzio-invoice-portal {
      display: block !important;
      position: fixed !important;
      inset: 0 !important;
      background: #fff !important;
      z-index: 99999 !important;
      overflow: visible !important;
    }
    .iv-overlay  { background: transparent !important; padding: 0 !important; overflow: visible !important; }
    .iv-no-print { display: none !important; }
    .iv-sheet    { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; width: 100% !important; }
    @page { size: A4 portrait; margin: 0; }
  }
`;

export default function InvoiceViewer({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const st = STATUS_STYLE[invoice.status];

  const content = (
    <div id="werzio-invoice-portal">
      <style>{PRINT_STYLES}</style>

      {/* Dark overlay */}
      <div
        className="iv-overlay"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}
      >
        <div id="invoice-print-root" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Toolbar */}
          <div className="iv-no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", opacity: 0.9 }}>{invoice.number}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => window.print()}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                <Printer size={14} /> Print / Save PDF
              </button>
              <button onClick={onClose}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", cursor: "pointer" }}>
                <X size={16} color="#fff" />
              </button>
            </div>
          </div>

          {/* Invoice sheet */}
          <div className="iv-sheet" style={{ background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden" }}>

            {/* Top gradient bar */}
            <div style={{ height: 6, background: "linear-gradient(90deg,#5B21B6,#9333EA,#ec4899)" }} />

            <div style={{ padding: "40px 48px" }}>

              {/* Header row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
                {/* Werzio branding */}
                <div>
                  {/* Real Werzio logo */}
                  <img
                    src="/werzio logo.png"
                    alt="Werzio"
                    style={{ height: 44, width: "auto", display: "block" }}
                  />
                  <div style={{ marginTop: 10, fontSize: 12, color: "#9898b0", lineHeight: 1.7 }}>
                    Salon Management Software<br />
                    iamusmankhan101@gmail.com<br />
                    +92 305 8562523
                  </div>
                </div>

                {/* INVOICE + number + status */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.5px" }}>INVOICE</div>
                  <div style={{ fontSize: 14, color: "#7C3AED", fontWeight: 700, marginTop: 4 }}>{invoice.number}</div>
                  <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, background: st.bg, border: `1px solid ${st.border}`, fontSize: 12, fontWeight: 800, color: st.color, letterSpacing: "0.06em" }}>
                    {st.label}
                  </div>
                </div>
              </div>

              {/* Date row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 36, padding: "18px 22px", background: "#f8f8fc", borderRadius: 12, border: "1px solid #ebebf0" }}>
                {[
                  { label: "Issue Date", value: fmtDate(invoice.issuedDate) },
                  { label: "Due Date",   value: fmtDate(invoice.dueDate) },
                  { label: "Paid Date",  value: invoice.paidDate ? fmtDate(invoice.paidDate) : "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Billed from / to */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 36 }}>
                {/* From */}
                <div style={{ padding: "20px 22px", borderRadius: 12, border: "1px solid #ebebf0", background: "#fafafd" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 12 }}>Billed From</div>
                  <img src="/werzio logo.png" alt="Werzio" style={{ height: 28, width: "auto", display: "block", marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: "#6b6b8a", lineHeight: 1.8 }}>
                    Salon Management Software<br />
                    iamusmankhan101@gmail.com<br />
                    +92 305 8562523<br />
                    Pakistan
                  </div>
                </div>
                {/* To */}
                <div style={{ padding: "20px 22px", borderRadius: 12, border: "2px solid #EDE9FE", background: "#faf8ff" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 12 }}>Billed To</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e", marginBottom: 4 }}>{invoice.salonName}</div>
                  <div style={{ fontSize: 12, color: "#6b6b8a", lineHeight: 1.8 }}>
                    {invoice.userName}<br />
                    {invoice.userEmail}<br />
                    {invoice.userPhone}<br />
                    Pakistan
                  </div>
                </div>
              </div>

              {/* Items table */}
              <div style={{ marginBottom: 28 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg,#5B21B6,#9333EA)" }}>
                      {["Description", "Qty", "Unit Price", "Total"].map((h, i) => (
                        <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: i === 0 ? "left" : "right", borderRadius: i === 0 ? "8px 0 0 8px" : i === 3 ? "0 8px 8px 0" : 0 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f0f0f8" }}>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#1a1a2e", fontWeight: 500 }}>{item.description}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b6b8a", textAlign: "right" }}>{item.qty}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b6b8a", textAlign: "right" }}>{fmt(item.unitPrice)}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "#1a1a2e", textAlign: "right" }}>{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 36 }}>
                <div style={{ width: 280 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f8", fontSize: 13, color: "#6b6b8a" }}>
                    <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f8", fontSize: 13, color: "#6b6b8a" }}>
                    <span>Tax</span><span>PKR 0</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", marginTop: 8, background: "linear-gradient(135deg,#5B21B6,#9333EA)", borderRadius: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Total Due</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{fmt(invoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment instructions */}
              <div style={{ borderRadius: 12, border: "1px solid #ebebf0", overflow: "hidden", marginBottom: 32 }}>
                <div style={{ padding: "12px 18px", background: "#f8f8fc", borderBottom: "1px solid #ebebf0", fontSize: 11, fontWeight: 800, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em" }}>Payment Instructions</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                  <div style={{ padding: "16px 18px", borderRight: "1px solid #ebebf0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: "#2DC84D", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>e</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#065f46" }}>EasyPaisa</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b6b8a", lineHeight: 1.8 }}>
                      <strong>Name:</strong> Muhammad Usman Khan<br />
                      <strong>Number:</strong> 03058562523
                    </div>
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: "#fff" }}>BNK</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#0c4a6e" }}>Bank Transfer</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b6b8a", lineHeight: 1.8 }}>
                      <strong>Bank:</strong> Meezan Bank<br />
                      <strong>Title:</strong> Muhammad Usman Khan<br />
                      <strong>Account:</strong> 02361019994452
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ textAlign: "center", paddingTop: 20, borderTop: "1px solid #f0f0f8" }}>
                <div style={{ fontSize: 12, color: "#9898b0", lineHeight: 1.7 }}>
                  Thank you for choosing <strong style={{ color: "#7C3AED" }}>Werzio</strong> — powering your salon's success.<br />
                  Questions? Contact us at iamusmankhan101@gmail.com
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{ height: 4, background: "linear-gradient(90deg,#5B21B6,#9333EA,#ec4899)" }} />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}