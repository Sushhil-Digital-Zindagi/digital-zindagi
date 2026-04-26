// ============================================================
// Admin Session Manager
// Stores admin verification token in sessionStorage.
// Token = base64(email:timestamp) — validated locally.
// Cleared on browser tab close (sessionStorage behaviour).
// ============================================================

const ADMIN_TOKEN_KEY = "dz_admin_token";
const ADMIN_VERIFIED_KEY = "adminVerified";
const TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_VERIFIED_KEY, "true");
    sessionStorage.setItem("dz_admin_verified", "true");
    sessionStorage.setItem("dz_admin_token_ts", String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_VERIFIED_KEY);
    sessionStorage.removeItem("dz_admin_token_ts");
  } catch {
    /* ignore */
  }
}

export function isAdminSessionValid(): boolean {
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    const verified = sessionStorage.getItem(ADMIN_VERIFIED_KEY);
    const ts = sessionStorage.getItem("dz_admin_token_ts");
    if (!token || !verified) return false;
    if (ts && Date.now() - Number(ts) > TOKEN_EXPIRY_MS) {
      clearAdminToken();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Generate a deterministic token from email — stored in sessionStorage */
export function generateAdminToken(email: string): string {
  return btoa(`${email}:${Date.now()}`);
}

/** React hook that returns {token, isValid, setToken, clearToken} */
export function useAdminSession() {
  const token = getAdminToken();
  const isValid = isAdminSessionValid();

  return {
    token,
    isValid,
    setAdminToken,
    clearAdminToken,
    generateAdminToken,
    isAdminSessionValid,
  };
}
