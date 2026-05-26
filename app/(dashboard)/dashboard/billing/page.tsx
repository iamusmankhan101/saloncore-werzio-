"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Zap, Crown, AlertTriangle, Smartphone, Building2, X, Copy, BadgeCheck, ImagePlus, Clock, Eye, CheckCircle, AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { addPaymentRequest, getActivePlan, getPaymentRequests, type PaymentMethod } from "@/lib/payment-requests";
import { syncInvoices, type Invoice, type InvoiceStatus } from "@/lib/invoices";
import InvoiceViewer from "@/components/invoice-viewer";

const PLANS = [
  {
    id: "standard",
    name: "Standard",
    price: 6500,
    icon: Zap,
    color: "#0369a1",
    bg: "#e0f2fe",
    features: [
      "Unlimited appointments",
      "Calendar & scheduling",
      "Client management",
      "Staff management",
      "Services management",
      "Revenue & analytics",
      "Inventory management",
      "Online booking page",
    ],
    whatsapp: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: 8500,
    icon: Crown,
    color: "#7C3AED",
    bg: "#EDE9FE",
    features: [
      "Everything in Standard",
      "WhatsApp booking confirmations",
      "WhatsApp appointment reminders",
      "WhatsApp follow-up messages",
      "WhatsApp low stock alerts",
    ],
    whatsapp: true,
  },
];

const DEFAULT_PLAN_ID = "premium";

const EP_DETAILS = { name: "Muhammad Usman Khan", phone: "03058562523" };
const BANK_DETAILS = { bank: "Meezan Bank", name: "Muhammad Usman Khan", account: "02361019994452" };

const STATUS_META: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  paid:    { label: "Paid",    color: "#059669", bg: "#ecfdf5", icon: CheckCircle },
  unpaid:  { label: "Unpaid",  color: "#d97706", bg: "#fffbeb", icon: Clock },
  overdue: { label: "Overdue", color: "#dc2626", bg: "#fef2f2", icon: AlertCircle },
};

function fmt(n: number) { return "PKR " + n.toLocaleString("en-PK"); }
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

function EasypaisaLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#2DC84D" />
      <text x="20" y="27" textAnchor="middle" fontSize="20" fontWeight="900" fontFamily="Arial,sans-serif" fill="#fff">e</text>
    </svg>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f4f5f7", borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{value}</span>
        <button onClick={copy} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "2px 6px", borderRadius: 6, color: copied ? "#059669" : "#9898b0" }}>
          {copied ? <BadgeCheck size={13} /> : <Copy size={13} />}
          <span style={{ fontSize: 10, fontWeight: 700 }}>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [showUpgrade, setShowUpgrade] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("easypaisa");
  const [screenshot, setScreenshot] = useState<{ base64: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string>(DEFAULT_PLAN_ID);
  const [hasPending, setHasPending] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ap = getActivePlan();
    if (ap) setActivePlanId(ap);
    const user = getCurrentUser();
    if (!user) return;

    const planId = ap ?? DEFAULT_PLAN_ID;
    const plan = PLANS.find((p) => p.id === planId) ?? PLANS[1];

    const synced = syncInvoices(
      { id: user.id, ownerName: user.ownerName, salonName: user.salonName, email: user.email, phone: user.phone },
      { id: plan.id, name: plan.name, price: plan.price },
      user.createdAt,
    );
    setInvoices(synced.filter((inv) => inv.userId === user.id));

    const pending = getPaymentRequests().some((r) => r.userId === user.id && r.status === "pending");
    setHasPending(pending);
  }, [submitted]);

  const currentPlan = PLANS.find((p) => p.id === activePlanId) ?? PLANS[1];
  const upgradePlan = PLANS.find((p) => p.name === showUpgrade);
  const latestInvoice = invoices[0];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshot({ base64: reader.result as string, name: file.name });
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!upgradePlan) return;
    const user = getCurrentUser();
    setSubmitting(true);
    addPaymentRequest({
      userId: user?.id ?? "guest",
      userEmail: user?.email ?? "",
      userName: user?.ownerName ?? "",
      salonName: user?.salonName ?? "",
      planId: upgradePlan.id,
      planName: upgradePlan.name,
      amount: upgradePlan.price,
      payMethod,
      screenshotBase64: screenshot?.base64 ?? null,
      screenshotName: screenshot?.name ?? null,
    });
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setHasPending(true);
      setTimeout(() => { setSubmitted(false); setShowUpgrade(null); setScreenshot(null); }, 2000);
    }, 800);
  }

  function openModal(planName: string) {
    setShowUpgrade(planName);
    setScreenshot(null);
    setPayMethod("easypaisa");
  }

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Invoice viewer overlay */}
      {viewingInvoice && <InvoiceViewer invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />}

      {/* Switch plan modal */}
      {showUpgrade && upgradePlan && (
        <div onClick={() => setShowUpgrade(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 480, boxShadow: "0 24px 70px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh", overflowY: "auto" }}>

            <div style={{ background: `linear-gradient(135deg, ${upgradePlan.color}dd, ${upgradePlan.color})`, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <upgradePlan.icon size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Activate Plan</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#fff" }}>{upgradePlan.name} — {fmt(upgradePlan.price)}<span style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>/mo</span></div>
                </div>
              </div>
              <button onClick={() => setShowUpgrade(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", padding: 7, borderRadius: 8 }}>
                <X size={16} color="#fff" />
              </button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: "11px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                Send <strong>{fmt(upgradePlan.price)}</strong> to either account below, attach your payment screenshot, then click Submit. Your plan will be activated once verified by admin.
              </div>

              {/* Method tabs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {([
                  { id: "easypaisa" as const, label: "EasyPaisa", color: "#2DC84D", bg: "#f0fdf4" },
                  { id: "bank" as const, label: "Bank Transfer", color: "#0369a1", bg: "#e0f2fe" },
                ]).map(({ id, label, color, bg }) => (
                  <button key={id} type="button" onClick={() => setPayMethod(id)}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: 11, border: `2px solid ${payMethod === id ? color : "#e8e8f0"}`, background: payMethod === id ? bg : "#fafafd", cursor: "pointer" }}>
                    {id === "easypaisa" ? (
                      <EasypaisaLogo size={26} />
                    ) : (
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: payMethod === id ? color + "20" : "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Building2 size={13} color={payMethod === id ? color : "#b0b0c8"} />
                      </div>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: payMethod === id ? color : "#6b6b8a" }}>{label}</span>
                  </button>
                ))}
              </div>

              {/* EasyPaisa details */}
              {payMethod === "easypaisa" && (
                <div style={{ borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <EasypaisaLogo size={34} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#065f46" }}>EasyPaisa</div>
                      <div style={{ fontSize: 11, color: "#6b9e7e" }}>Send payment to this account</div>
                    </div>
                  </div>
                  <CopyField label="Account Name" value={EP_DETAILS.name} />
                  <CopyField label="Mobile Number" value={EP_DETAILS.phone} />
                </div>
              )}

              {/* Bank details */}
              {payMethod === "bank" && (
                <div style={{ borderRadius: 12, border: "1px solid #bae6fd", background: "#eff6ff", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Building2 size={16} color="#0369a1" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#0c4a6e" }}>Bank Transfer</div>
                      <div style={{ fontSize: 11, color: "#6b8fa8" }}>Transfer to this account</div>
                    </div>
                  </div>
                  <CopyField label="Bank" value={BANK_DETAILS.bank} />
                  <CopyField label="Account Title" value={BANK_DETAILS.name} />
                  <CopyField label="Account Number" value={BANK_DETAILS.account} />
                </div>
              )}

              {/* Screenshot upload */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Attach Payment Screenshot</div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
                {screenshot ? (
                  <div style={{ borderRadius: 12, border: "1px solid #d1d5db", overflow: "hidden", position: "relative" }}>
                    <img src={screenshot.base64} alt="Payment screenshot" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                    <button onClick={() => setScreenshot(null)}
                      style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <X size={13} color="#fff" />
                    </button>
                    <div style={{ padding: "8px 12px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
                      <BadgeCheck size={13} color="#059669" />{screenshot.name}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ width: "100%", padding: "20px", borderRadius: 12, border: "2px dashed #d1d5db", background: "#fafafa", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ImagePlus size={18} color="#9898b0" />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#6b6b8a" }}>Click to attach screenshot</div>
                    <div style={{ fontSize: 11, color: "#b0b0c8" }}>PNG, JPG, WEBP supported</div>
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
                <button onClick={() => setShowUpgrade(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || submitted}
                  style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: submitted ? "#ecfdf5" : submitting ? "#e8e8f0" : `linear-gradient(135deg,${upgradePlan.color}cc,${upgradePlan.color})`, fontSize: 13, fontWeight: 700, color: submitted ? "#059669" : submitting ? "#aaaabc" : "#fff", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  {submitted ? <><BadgeCheck size={15} /> Request Submitted!</> : submitting ? "Submitting..." : "Submit Payment Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div style={{ fontWeight: 800, fontSize: 22, color: "#1a1a2e" }}>Billing</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginTop: 2 }}>Manage your subscription and invoices</div>
      </div>

      {/* Pending notice */}
      {hasPending && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "#eff6ff", border: "1px solid #bae6fd", borderRadius: 12 }}>
          <Clock size={16} color="#0369a1" />
          <div style={{ fontSize: 13, color: "#0c4a6e" }}>
            You have a <strong>pending payment request</strong> under admin review. Your plan will be activated once payment is verified.
          </div>
        </div>
      )}

      {/* Current plan banner */}
      <div style={{ background: "linear-gradient(135deg,#5B21B6,#9333EA)", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <currentPlan.icon size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Current Plan</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginTop: 2 }}>{currentPlan.name}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>Renews 1st of every month · {fmt(currentPlan.price)}/month</div>
          </div>
        </div>
        {latestInvoice && (
          <button onClick={() => setViewingInvoice(latestInvoice)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            <Eye size={14} /> View Latest Invoice
          </button>
        )}
      </div>

      {/* Next invoice alert */}
      {latestInvoice && latestInvoice.status !== "paid" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: latestInvoice.status === "overdue" ? "#fef2f2" : "#fffbeb", border: `1px solid ${latestInvoice.status === "overdue" ? "#fecaca" : "#fde68a"}`, borderRadius: 12 }}>
          <AlertTriangle size={16} color={latestInvoice.status === "overdue" ? "#dc2626" : "#d97706"} />
          <div style={{ fontSize: 13, color: latestInvoice.status === "overdue" ? "#991b1b" : "#92400e" }}>
            Invoice <strong>{latestInvoice.number}</strong> of <strong>{fmt(latestInvoice.total)}</strong> is{" "}
            {latestInvoice.status === "overdue" ? <strong>overdue</strong> : <>due on <strong>{fmtDate(latestInvoice.dueDate)}</strong></>}.{" "}
            <button onClick={() => setViewingInvoice(latestInvoice)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, textDecoration: "underline", fontSize: 13, color: "inherit", padding: 0 }}>View invoice</button>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 16 }}>Available Plans</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === activePlanId;
            return (
              <div key={plan.id} style={{ background: "#fff", borderRadius: 16, border: `2px solid ${isCurrent ? plan.color : "#ebebf0"}`, padding: "24px", display: "flex", flexDirection: "column", gap: 16, position: "relative", boxShadow: isCurrent ? `0 4px 20px ${plan.color}22` : "none" }}>
                {isCurrent && (
                  <div style={{ position: "absolute", top: -1, right: 16, background: plan.color, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: "0 0 8px 8px", letterSpacing: "0.07em" }}>CURRENT</div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: plan.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={19} color={plan.color} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: "#1a1a2e" }}>{plan.name}</div>
                  </div>
                  {plan.whatsapp && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "#dcfce7", border: "1px solid #86efac" }}>
                      <Smartphone size={11} color="#16a34a" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>WhatsApp</span>
                    </div>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#1a1a2e" }}>{fmt(plan.price)}</span>
                  <span style={{ fontSize: 13, color: "#9898b0" }}>/month</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: plan.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={10} color={plan.color} />
                      </div>
                      <span style={{ fontSize: 13, color: "#4a4a6a" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => !isCurrent && openModal(plan.name)}
                  style={{ padding: "11px 0", borderRadius: 10, border: `1px solid ${isCurrent ? plan.color : "#e8e8f0"}`, background: isCurrent ? plan.bg : "#fff", fontSize: 13, fontWeight: 700, color: isCurrent ? plan.color : "#6b6b8a", cursor: isCurrent ? "default" : "pointer" }}>
                  {isCurrent ? "Current Plan" : "Switch to " + plan.name}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice history */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e" }}>Invoice History</div>
          <div style={{ fontSize: 12, color: "#9898b0" }}>Generated on the 1st of every month</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 110px 90px 48px", padding: "10px 24px", borderBottom: "1px solid #f0f0f8", background: "#fafafa" }}>
          {["INVOICE", "ISSUED", "DUE DATE", "AMOUNT", "STATUS", ""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", fontSize: 13, color: "#9898b0" }}>No invoices yet</div>
        ) : (
          invoices.map((inv, i) => {
            const sm = STATUS_META[inv.status];
            const Icon = sm.icon;
            return (
              <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 110px 90px 48px", padding: "13px 24px", borderBottom: i < invoices.length - 1 ? "1px solid #f4f4f8" : "none", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{inv.number}</div>
                <div style={{ fontSize: 12, color: "#6b6b8a" }}>{fmtDate(inv.issuedDate)}</div>
                <div style={{ fontSize: 12, color: "#6b6b8a" }}>{fmtDate(inv.dueDate)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(inv.total)}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: sm.bg, fontSize: 11, fontWeight: 700, color: sm.color }}>
                  <Icon size={10} /> {sm.label}
                </div>
                <button onClick={() => setViewingInvoice(inv)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid #e8e8f0", background: "#fff", cursor: "pointer" }}>
                  <Eye size={13} color="#9898b0" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
