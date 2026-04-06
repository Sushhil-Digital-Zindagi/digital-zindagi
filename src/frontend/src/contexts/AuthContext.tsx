import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserRole } from "../backend";

export const SUPER_ADMIN_EMAIL = "sushhilkumar651@gmail.com";

export interface SessionUser {
  userId: bigint;
  name: string;
  role: UserRole | "manager";
  mobile: string;
  email?: string;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  login: (user: SessionUser) => void;
  logout: () => void;
  isSuperAdmin: boolean;
  isFullAdmin: boolean;
}

const SESSION_KEY = "dz_session";
const SESSION_EXPIRY_KEY = "dz_session_expiry";
// 30 days in milliseconds
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isSuperAdmin: false,
  isFullAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
      if (stored) {
        // Check 30-day expiry
        if (expiry && Date.now() > Number(expiry)) {
          // Expired — clear session
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_EXPIRY_KEY);
          sessionStorage.removeItem("adminVerified");
        } else {
          const parsed = JSON.parse(stored);
          const restored: SessionUser = {
            ...parsed,
            userId: BigInt(parsed.userId),
          };
          setUser(restored);
          // Auto-grant admin access if Super Admin email is restored from session
          if (
            restored.isSuperAdmin ||
            restored.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
          ) {
            sessionStorage.setItem("adminVerified", "true");
          }
          // Refresh expiry on restore (sliding window)
          localStorage.setItem(
            SESSION_EXPIRY_KEY,
            String(Date.now() + SESSION_DURATION_MS),
          );
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (sessionUser: SessionUser) => {
    // Check super admin status by email
    const isSuperAdminFlag =
      sessionUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
      sessionUser.isSuperAdmin === true;
    // If super admin email, also force role to admin
    const enriched: SessionUser = {
      ...sessionUser,
      isSuperAdmin: isSuperAdminFlag,
      role: isSuperAdminFlag ? ("admin" as UserRole) : sessionUser.role,
    };
    setUser(enriched);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...enriched, userId: enriched.userId.toString() }),
    );
    // Set 30-day expiry timestamp
    localStorage.setItem(
      SESSION_EXPIRY_KEY,
      String(Date.now() + SESSION_DURATION_MS),
    );
    // Super Admin gets automatic admin panel access — no PIN needed
    if (isSuperAdminFlag) {
      sessionStorage.setItem("adminVerified", "true");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    sessionStorage.removeItem("adminVerified");
  };

  const isSuperAdmin =
    user?.isSuperAdmin === true ||
    user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const isFullAdmin = isSuperAdmin || user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isSuperAdmin, isFullAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function hashPassword(pwd: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pwd);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
