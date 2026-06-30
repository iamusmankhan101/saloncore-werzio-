import { saveSettings, settingsStore } from "./settings-store";
import { userKey } from "./auth";

export interface SalonLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "location";
}

export function getSalonLocations(): SalonLocation[] {
  const configured = (settingsStore as { locations?: { items?: SalonLocation[] } }).locations?.items;
  if (Array.isArray(configured) && configured.length > 0) return configured;
  const salon = settingsStore.salon as { address?: string; city?: string };
  return [{ id: "main", name: "Main Branch", address: salon.address, city: salon.city }];
}

export function getDefaultLocationId() {
  const locations = getSalonLocations();
  const active = (settingsStore as { locations?: { activeLocationId?: string } }).locations?.activeLocationId;
  return locations.some((location) => location.id === active) ? active! : locations[0]?.id ?? "main";
}

export function getActiveLocationFilter() {
  const locations = getSalonLocations();
  const active = (settingsStore as { locations?: { activeLocationId?: string } }).locations?.activeLocationId;
  return locations.some((location) => location.id === active) ? active! : locations[0]?.id ?? "main";
}

export function setActiveLocationFilter(locationId: string) {
  const locations = getSalonLocations();
  const nextId = locations.some((location) => location.id === locationId)
    ? locationId
    : locations[0]?.id ?? "main";

  (settingsStore as any).locations = {
    ...(settingsStore as any).locations,
    activeLocationId: nextId,
    items: locations,
  };
  saveSettings();
  return nextId;
}

/**
 * Keeps the original Main Branch key for backward compatibility while giving
 * every additional branch a completely independent user-scoped data slot.
 */
export function locationUserKey(baseKey: string, locationId = getActiveLocationFilter()) {
  return userKey(locationId === "main" ? baseKey : `${baseKey}__location_${locationId}`);
}

export function clientLocationId(client: { locationId?: string }) {
  return client.locationId || getDefaultLocationId();
}

export function locationName(locationId?: string) {
  const id = locationId || getDefaultLocationId();
  return getSalonLocations().find((location) => location.id === id)?.name || "Main Branch";
}

export function addSalonLocation(name: string): SalonLocation {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Location name is required.");
  const locations = getSalonLocations();
  const existing = locations.find((location) => location.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) return existing;

  const baseId = slug(cleanName);
  let id = baseId;
  let counter = 2;
  while (locations.some((location) => location.id === id)) {
    id = `${baseId}-${counter++}`;
  }

  const next = { id, name: cleanName };
  (settingsStore as any).locations = {
    activeLocationId: getDefaultLocationId(),
    items: [...locations, next],
  };
  saveSettings();
  return next;
}
