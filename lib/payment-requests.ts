export type PaymentStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "easypaisa" | "bank";

export interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  salonName: string;
  planId: string;
  planName: string;
  amount: number;
  payMethod: PaymentMethod;
  screenshotBase64: string | null;
  screenshotName: string | null;
  status: PaymentStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

const KEY = "glowbook_payment_requests";
const ACTIVE_PLAN_KEY = "glowbook_active_plan";

export function getPaymentRequests(): PaymentRequest[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function saveRequests(list: PaymentRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addPaymentRequest(req: Omit<PaymentRequest, "id" | "submittedAt" | "reviewedAt" | "reviewNote" | "status">): PaymentRequest {
  const entry: PaymentRequest = {
    ...req,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewNote: null,
  };
  const list = getPaymentRequests();
  saveRequests([entry, ...list]);
  return entry;
}

export function updatePaymentRequest(id: string, status: PaymentStatus, note?: string): PaymentRequest | null {
  const list = getPaymentRequests();
  let updated: PaymentRequest | null = null;
  const next = list.map((r) => {
    if (r.id !== id) return r;
    updated = { ...r, status, reviewedAt: new Date().toISOString(), reviewNote: note ?? null };
    return updated;
  });
  saveRequests(next);
  return updated;
}

export function getActivePlan(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_PLAN_KEY);
}

export function setActivePlan(planId: string) {
  localStorage.setItem(ACTIVE_PLAN_KEY, planId);
}