/**
 * lib/auth-new.ts
 * Client-side authentication using database-backed API
 */

const SESSION_KEY = "werzio_auth_session";
const USER_CACHE_KEY = "werzio_user_cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  ownerName: string;
  salonName: string;
  phone: string;
  role: "owner" | "admin";
  emailVerified: boolean;
  createdAt: string;
}

// ─── Session management ───────────────────────────────────────────────────────

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

function setSessionId(userId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, userId);
  }
}

function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ─── User cache (for offline access) ─────────────────────────────────────────

function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const sessionId = getSessionId();
    if (!sessionId) return null;
    const cached = localStorage.getItem(`${USER_CACHE_KEY}_${sessionId}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: AuthUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(`${USER_CACHE_KEY}_${user.id}`, JSON.stringify(user));
  }
}

function clearCachedUser() {
  if (typeof window !== "undefined") {
    const sessionId = getSessionId();
    if (sessionId) {
      localStorage.removeItem(`${USER_CACHE_KEY}_${sessionId}`);
    }
  }
}

// ─── Auth operations ──────────────────────────────────────────────────────────

export async function signUp(input: {
  email: string;
  password: string;
  ownerName: string;
  salonName: string;
  phone: string;
  adminCode?: string;
}): Promise<AuthUser> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || "Failed to create account.");
  }

  // For admin, set session immediately. For regular users, wait for email verification
  if (data.user.emailVerified) {
    setSessionId(data.user.id);
    setCachedUser(data.user);
  }

  return data.user;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || "Authentication failed.");
  }

  // Set session and cache user
  setSessionId(data.user.id);
  setCachedUser(data.user);

  return data.user;
}

export function signOut() {
  clearSession();
  clearCachedUser();
  if (typeof window !== "undefined") {
    window.location.href = "/sign-in";
  }
}

export function getCurrentUser(): AuthUser | null {
  return getCachedUser();
}

export async function refreshCurrentUser(): Promise<AuthUser | null> {
  const sessionId = getSessionId();
  if (!sessionId) return null;

  try {
    const res = await fetch(`/api/auth/user?userId=${sessionId}`);
    const data = await res.json();

    if (data.ok && data.user) {
      setCachedUser(data.user);
      return data.user;
    }

    // Session invalid, clear it
    clearSession();
    clearCachedUser();
    return null;
  } catch (err) {
    console.error("[auth] Failed to refresh user:", err);
    return getCachedUser(); // Return cached user as fallback
  }
}

export async function markEmailVerified(email: string): Promise<void> {
  // Email is already verified in the database by the API
  // Just fetch the user and set session
  try {
    const res = await fetch(`/api/auth/user?userId=${email}`);
    const data = await res.json();
    
    if (data.ok && data.user) {
      setSessionId(data.user.id);
      setCachedUser(data.user);
    }
  } catch (err) {
    console.error("[auth] Failed to fetch user after verification:", err);
  }
}

export async function updateCurrentUser(input: Partial<Pick<AuthUser, "ownerName" | "salonName" | "phone">>): Promise<AuthUser> {
  const current = getCurrentUser();
  if (!current) throw new Error("You must be signed in to update your account.");

  // TODO: Create API endpoint for updating user
  // For now, just update the cache
  const updated = { ...current, ...input };
  setCachedUser(updated);
  return updated;
}

export function getUnverifiedUser(email: string): AuthUser | null {
  // This function is no longer needed with database auth
  // Email verification status is checked in the database
  return null;
}

// ─── Helper for localStorage keys ─────────────────────────────────────────────

export function userKey(base: string): string {
  const sessionId = getSessionId();
  if (!sessionId) return base;
  return `${base}_${sessionId}`;
}
