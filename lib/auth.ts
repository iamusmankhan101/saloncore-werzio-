export interface AuthUser {
  id: string;
  ownerName: string;
  salonName: string;
  email: string;
  phone: string;
  role: "owner" | "manager" | "staff" | "admin";
  createdAt: string;
  salonOwnerId?: string;
  staffId?: string;
  permissions?: string[];
}

interface StoredUser extends AuthUser {
  password: string;
  emailVerified: boolean;
}

const USERS_KEY = "werzio_auth_users";
const SESSION_KEY = "werzio_auth_session";

const demoUser: StoredUser = {
  id: "demo-owner",
  ownerName: "Amna Khan",
  salonName: "Amna's Salon",
  email: "owner@werzio.pk",
  phone: "+92 300 1234567",
  role: "owner",
  createdAt: "2026-03-19",
  password: "Werzio123",
  emailVerified: true,
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function withoutPassword(user: StoredUser): AuthUser {
  return {
    id: user.id,
    ownerName: user.ownerName,
    salonName: user.salonName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// Admin authenticates via the /api/auth/signin route (Turso DB) only —
// never stored in client-side localStorage seed data.
const SEED_USERS = [demoUser];

export function getUsers(): StoredUser[] {
  if (!canUseStorage()) return SEED_USERS;

  const saved = localStorage.getItem(USERS_KEY);
  if (!saved) {
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }

  try {
    let parsed = JSON.parse(saved) as StoredUser[];
    let changed = false;
    for (const seed of SEED_USERS) {
      if (!parsed.some((u) => u.id === seed.id)) {
        parsed = [seed, ...parsed];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(USERS_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }
}

export function getCurrentUser(): AuthUser | null {
  if (!canUseStorage()) return null;

  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;

  // First check if user data is cached in localStorage
  const cachedUser = localStorage.getItem(`werzio_user_cache_${sessionId}`);
  if (cachedUser) {
    try {
      return JSON.parse(cachedUser);
    } catch {
      // Fall through to check old system
    }
  }

  // Fallback to old localStorage system for backward compatibility
  const user = getUsers().find((item) => item.id === sessionId);
  return user ? withoutPassword(user) : null;
}

export function signIn(email: string, password: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getUsers().find((item) => item.email.toLowerCase() === normalizedEmail);

  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }

  if (!user.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  localStorage.setItem(SESSION_KEY, user.id);
  return withoutPassword(user);
}

export function signUp(input: {
  ownerName: string;
  salonName: string;
  email: string;
  phone: string;
  password: string;
  adminCode?: string;
}): AuthUser {
  const users = getUsers();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }

  // Admin sign-up is handled server-side via /api/auth/signup — not client-side.
  const isAdmin = false;
  const user: StoredUser = {
    id: "user_" + Date.now(),
    ownerName: input.ownerName.trim(),
    salonName: input.salonName?.trim() || input.ownerName.trim(),
    email: normalizedEmail,
    phone: input.phone.trim(),
    role: isAdmin ? "admin" : "owner",
    createdAt: new Date().toISOString().split("T")[0],
    password: input.password,
    emailVerified: isAdmin, // admin skips email verification
  };

  localStorage.setItem(USERS_KEY, JSON.stringify([user, ...users]));
  if (isAdmin) localStorage.setItem(SESSION_KEY, user.id); // auto-login only for admin
  return withoutPassword(user);
}

export function markEmailVerified(email: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
  if (idx === -1) throw new Error("Account not found.");
  users[idx] = { ...users[idx], emailVerified: true };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, users[idx].id);
  
  // Migrate any plan that was set before login (during sign-up)
  const basePlanKey = "werzio_active_plan";
  const tempPlan = localStorage.getItem(basePlanKey);
  if (tempPlan) {
    // Move it to the user-scoped key
    localStorage.setItem(`${basePlanKey}_${users[idx].id}`, tempPlan);
    localStorage.removeItem(basePlanKey);
  }
  
  return withoutPassword(users[idx]);
}

export function updateCurrentUser(input: Partial<Pick<AuthUser, "ownerName" | "salonName" | "phone">>): AuthUser {
  const current = getCurrentUser();
  if (!current) throw new Error("You must be signed in to update your account.");

  const users = getUsers();
  const existsLocally = users.some((user) => user.id === current.id);

  if (existsLocally) {
    // Standard path: update local users list
    const updatedUsers = users.map((user) =>
      user.id === current.id
        ? {
            ...user,
            ownerName: input.ownerName?.trim() || user.ownerName,
            salonName: input.salonName?.trim() || user.salonName,
            phone: input.phone?.trim() || user.phone,
          }
        : user
    );
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    const updated = updatedUsers.find((user) => user.id === current.id)!;
    // Refresh cache so getCurrentUser() picks up the changes immediately
    localStorage.setItem(`werzio_user_cache_${current.id}`, JSON.stringify(withoutPassword(updated)));
    return withoutPassword(updated);
  } else {
    // Cloud/Turso user: not in local list — update the session cache directly
    const updatedUser: AuthUser = {
      ...current,
      ownerName: input.ownerName?.trim() || current.ownerName,
      salonName: input.salonName?.trim() || current.salonName,
      phone:     input.phone?.trim()     || current.phone,
    };
    localStorage.setItem(`werzio_user_cache_${current.id}`, JSON.stringify(updatedUser));
    return updatedUser;
  }
}

export function updateCurrentPassword(currentPassword: string, nextPassword: string) {
  const current = getCurrentUser();
  if (!current) throw new Error("You must be signed in to update your password.");

  const users = getUsers();
  const user = users.find((item) => item.id === current.id);
  if (!user || user.password !== currentPassword) {
    throw new Error("Current password is incorrect.");
  }

  const updatedUsers = users.map((item) =>
    item.id === current.id ? { ...item, password: nextPassword } : item
  );
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
}

export async function signOut() {
  if (!canUseStorage()) return;
  const sessionId = localStorage.getItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (sessionId) localStorage.removeItem(`werzio_user_cache_${sessionId}`);
  try {
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    // The local session is already cleared. A later server request will still
    // enforce the remaining cookie until connectivity is restored.
  }
}

/**
 * Returns a user-scoped localStorage key.
 * e.g. userKey("werzio_appointments") → "werzio_appointments_user_1234567890"
 * Falls back to the base key if no user is logged in (SSR / unauthenticated).
 */
export function userKey(base: string): string {
  if (!canUseStorage()) return base;
  const current = getCurrentUser();
  if (!current) return base;
  return `${base}_${current.salonOwnerId || current.id}`;
}

/**
 * Returns the user if the email exists in storage but is NOT yet verified.
 * Returns null if the email doesn't exist, or if it exists and IS already verified.
 * Used by the sign-up page to resend verification instead of showing a hard error.
 */
export function getUnverifiedUser(email: string): AuthUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getUsers().find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || user.emailVerified) return null;
  return withoutPassword(user);
}
