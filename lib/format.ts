import { settingsStore } from "./settings-store";

/** Format a number as a currency string using the salon's configured currency. */
export function fmtCurrency(n: number): string {
  const currency = settingsStore.salon.currency || "PKR";
  return `${currency} ${Math.round(n).toLocaleString("en-PK")}`;
}
