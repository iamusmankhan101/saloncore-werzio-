export interface AuthUser {
  id: string;
  ownerName: string;
  salonName: string;
  email: string;
  phone: string;
  role: "owner" | "manager" | "staff" | "admin";
  createdAt: string;
}

interface StoredUser extends AuthUser {
  password: string;
}

const USERS_KEY = "glowbook_auth_users";
const SESSION_KEY = "glowbook_auth_session";

const demoUser: StoredUser = {
  id: "demo-owner",
  ownerName: "Amna Khan",
  salonName: "Amna's Salon",
  email: "owner@glowbook.pk",
  phone: "+92 300 1234567",
  role: "owner",
  createdAt: "2026-03-19",
  password: "Glowbook123",
};

const adminUser: StoredUser = {
  id: "glowbook-admin",
  ownerName: "Muhammad Usman Khan",
  salonName: "GlowBook",
  email: "iamusmankhan101@gmail.com",
  phone: "+92 305 8562523",
  role: "admin",
  createdAt: "2026-01-01",
  password: "Babarthegoat12@_",
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

const SEED_USERS = [demoUser, adminUser];

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

  const user = getUsers().find((item) => item.id === sessionId);
  return user ? withoutPassword(user) : null;
}

export function signIn(email: string, password: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getUsers().find((item) => item.email.toLowerCase() === normalizedEmail);

  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }

  localStorage.setItem(SESSION_KEY, user.id);
  return withoutPassword(user);
}

const ADMIN_ACCESS_CODE = "GLOW@ADMIN2026";

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

  if (input.adminCode && input.adminCode !== ADMIN_ACCESS_CODE) {
    throw new Error("Invalid admin access code.");
  }

  const user: StoredUser = {
    id: "user_" + Date.now(),
    ownerName: input.ownerName.trim(),
    salonName: input.salonName.trim(),
    email: normalizedEmail,
    phone: input.phone.trim(),
    role: input.adminCode === ADMIN_ACCESS_CODE ? "admin" : "owner",
    createdAt: new Date().toISOString().split("T")[0],
    password: input.password,
  };

  localStorage.setItem(USERS_KEY, JSON.stringify([user, ...users]));
  localStorage.setItem(SESSION_KEY, user.id);
  return withoutPassword(user);
}

export function updateCurrentUser(input: Partial<Pick<AuthUser, "ownerName" | "salonName" | "phone">>): AuthUser {
  const current = getCurrentUser();
  if (!current) throw new Error("You must be signed in to update your account.");

  const users = getUsers();
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
  const updated = updatedUsers.find((user) => user.id === current.id);
  if (!updated) throw new Error("Account could not be updated.");
  return withoutPassword(updated);
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

export function signOut() {
  if (!canUseStorage()) return;
  localStorage.removeItem(SESSION_KEY);
}
