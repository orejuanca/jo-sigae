// Simple password-based auth for the Venezuelan school certification system
// Password: 3143

export const VALID_PASSWORD = "3143";
export const SESSION_KEY = "uenc_session";

export function login(password: string): boolean {
  if (password === VALID_PASSWORD) {
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    }
    return true;
  }
  return false;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function isAuthenticated(): boolean {
  if (typeof window !== "undefined") {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const data = JSON.parse(session);
        // Session expires after 24 hours
        if (data.authenticated && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return true;
        }
        localStorage.removeItem(SESSION_KEY);
      } catch {
        return false;
      }
    }
  }
  return false;
}

export function verifyServerSide(password: string): boolean {
  return password === VALID_PASSWORD;
}
