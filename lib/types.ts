// ─── Core Types ───────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "arrived"
  | "in-progress"
  | "completed"
  | "no-show"
  | "cancelled";

export type PaymentMethod =
  | "cash"
  | "jazzcash"
  | "easypaisa"
  | "raast"
  | "card"
  | "bank";

export type StaffRole =
  | "owner"
  | "manager"
  | "senior-stylist"
  | "junior-stylist"
  | "receptionist"
  | "trainee";

export type ServiceCategory = "hair" | "skin" | "nails" | "bridal" | "other";

export interface Staff {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  role: StaffRole;
  specialties: string[];
  color: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMin: number;
  price: number;
  assignedStaffIds: string[];
  isActive: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: "female" | "male" | "other";
  dob?: string;
  photo?: string;
  preferredStaffId?: string;
  tags: string[];
  source: "whatsapp" | "walk-in" | "web" | "manual";
  createdAt: string;
  totalVisits: number;
  totalSpend: number;
  lastVisitDate?: string;
  averageRating?: number;
}

export interface BeautyProfile {
  clientId: string;
  hairFormulas: {
    brand: string;
    shade: string;
    developer: string;
    ratio: string;
    processingTime: number;
    notes?: string;
  }[];
  skinType?: "oily" | "dry" | "combination" | "sensitive";
  allergies: string[];
  nailPrefs?: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  serviceIds: string[];
  serviceNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  totalAmount: number;
  notes?: string;
  source: "whatsapp" | "walk-in" | "web" | "manual";
}

export interface Payment {
  id: string;
  appointmentId: string;
  serviceAmount: number;
  tip: number;
  discountAmount: number;
  method: PaymentMethod;
  createdAt: string;
}

export interface DailyRevenue {
  date: string;
  total: number;
  appointments: number;
  avgTicket: number;
  byMethod: Partial<Record<PaymentMethod, number>>;
  tips: number;
}

export type InventoryCategory = "hair-color" | "skin-care" | "nail" | "tools" | "consumables" | "retail";
export type InventoryUnit = "ml" | "g" | "pcs" | "box" | "bottle" | "tube";

export interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  currentStock: number;
  minStock: number;
  costPrice: number;
  retailPrice?: number;
  supplier?: string;
  lastRestocked?: string;
  notes?: string;
}
