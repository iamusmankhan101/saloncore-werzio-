import type { Appointment } from "@/lib/types";

/**
 * Every stylist booked on an appointment, lead first. Older records (and any
 * booking made with one stylist) carry only `staffId`.
 */
export function appointmentStaffIds(appt: Pick<Appointment, "staffId" | "staffIds">): string[] {
  const ids = appt.staffIds?.length ? appt.staffIds : [appt.staffId];
  return ids.filter(Boolean);
}

/** Whether `staffId` works on this appointment, as lead or as an additional stylist. */
export function appointmentHasStaff(appt: Pick<Appointment, "staffId" | "staffIds">, staffId: string): boolean {
  return appointmentStaffIds(appt).includes(staffId);
}
