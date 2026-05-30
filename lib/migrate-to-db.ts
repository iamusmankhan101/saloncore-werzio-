/**
 * lib/migrate-to-db.ts
 * Utility to migrate localStorage data to database
 * Run this once per user to migrate their existing data
 */

import { getCurrentUser } from "@/lib/auth";

export async function migrateUserDataToDatabase(): Promise<{
  success: boolean;
  migrated: string[];
  errors: string[];
}> {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, migrated: [], errors: ["User not authenticated"] };
  }

  const migrated: string[] = [];
  const errors: string[] = [];
  const userId = user.id; // Store user.id to avoid null checks

  // Helper to get localStorage data
  function getLocalStorageData(key: string): any[] {
    try {
      const data = localStorage.getItem(`${key}_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Helper to migrate a resource
  async function migrateResource(
    resourceName: string,
    localStorageKey: string,
    transform?: (item: any) => any
  ) {
    try {
      const localData = getLocalStorageData(localStorageKey);
      
      if (localData.length === 0) {
        return; // Nothing to migrate
      }

      for (const item of localData) {
        const transformed = transform ? transform(item) : item;
        
        await fetch(`/api/data/${resourceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...transformed, user_id: userId }),
        });
      }

      migrated.push(`${resourceName} (${localData.length} records)`);
    } catch (err) {
      errors.push(`${resourceName}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Migrate each resource
  await migrateResource("appointments", "werzio_appointments");
  await migrateResource("clients", "werzio_clients");
  await migrateResource("staff", "werzio_staff");
  await migrateResource("services", "werzio_services");
  await migrateResource("products", "werzio_inventory");
  await migrateResource("invoices", "werzio_invoices", (invoice) => ({
    ...invoice,
    items: JSON.stringify(invoice.items || []),
  }));

  // Migrate settings
  try {
    const settings = localStorage.getItem(`werzio_settings_${userId}`);
    if (settings) {
      const parsed = JSON.parse(settings);
      await fetch(`/api/data/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          ...parsed,
          updated_at: new Date().toISOString(),
        }),
      });
      migrated.push("settings");
    }
  } catch (err) {
    errors.push(`settings: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  return {
    success: errors.length === 0,
    migrated,
    errors,
  };
}

// Function to clear localStorage after successful migration
export function clearLocalStorageData() {
  const user = getCurrentUser();
  if (!user) return;

  const keys = [
    `werzio_appointments_${user.id}`,
    `werzio_clients_${user.id}`,
    `werzio_staff_${user.id}`,
    `werzio_services_${user.id}`,
    `werzio_inventory_${user.id}`,
    `werzio_invoices_${user.id}`,
    `werzio_settings_${user.id}`,
  ];

  keys.forEach(key => localStorage.removeItem(key));
  
  console.log("[migrate] ✓ Cleared localStorage data");
}
