// ============================================================
// Offer Auth Context — completely isolated from main AuthContext
// Session stored in localStorage under "dz_offer_session"
// with 7-day rolling expiry. BigInt serialized as strings.
// ============================================================
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { OfferUser } from "../types/offerTypes";

const SESSION_KEY = "dz_offer_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StoredSession {
  user: {
    id: string;
    userId: string;
    email: string;
    passwordHash: string;
    referralCode: string;
    referredBy?: string;
    totalEarnings: string;
    pendingEarnings: string;
    createdAt: string;
  };
  expiry: number;
}

function serializeUser(user: OfferUser): StoredSession["user"] {
  return {
    id: user.id.toString(),
    userId: user.userId,
    email: user.email,
    passwordHash: user.passwordHash ?? "",
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    totalEarnings: user.totalEarnings.toString(),
    pendingEarnings: user.pendingEarnings.toString(),
    createdAt: user.createdAt.toString(),
  };
}

function deserializeUser(s: StoredSession["user"]): OfferUser {
  return {
    id: BigInt(s.id),
    userId: s.userId,
    email: s.email,
    passwordHash: s.passwordHash ?? "",
    referralCode: s.referralCode,
    referredBy: s.referredBy,
    totalEarnings: BigInt(s.totalEarnings),
    pendingEarnings: BigInt(s.pendingEarnings),
    createdAt: BigInt(s.createdAt),
  };
}

function loadSession(): OfferUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.expiry || Date.now() > parsed.expiry) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return deserializeUser(parsed.user);
  } catch {
    // Corrupted storage — clear it and start fresh
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveSession(user: OfferUser): void {
  const session: StoredSession = {
    user: serializeUser(user),
    expiry: Date.now() + SESSION_DURATION_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface OfferAuthContextType {
  currentOfferUser: OfferUser | null;
  offerAuthLoading: boolean;
  isLoggedIn: boolean;
  login: (user: OfferUser) => void;
  logout: () => void;
  /** @deprecated use login() */
  loginOffer: (user: OfferUser) => void;
  /** @deprecated use logout() */
  logoutOffer: () => void;
}

const OfferAuthContext = createContext<OfferAuthContextType>({
  currentOfferUser: null,
  offerAuthLoading: true,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  loginOffer: () => {},
  logoutOffer: () => {},
});

export function OfferAuthProvider({ children }: { children: ReactNode }) {
  const [currentOfferUser, setCurrentOfferUser] = useState<OfferUser | null>(
    null,
  );
  const [offerAuthLoading, setOfferAuthLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const restored = loadSession();
    if (restored) {
      setCurrentOfferUser(restored);
      // Rolling expiry — refresh on load if session is valid
      saveSession(restored);
    }
    setOfferAuthLoading(false);
  }, []);

  const login = useCallback((user: OfferUser) => {
    setCurrentOfferUser(user);
    saveSession(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentOfferUser(null);
    clearSession();
  }, []);

  return (
    <OfferAuthContext.Provider
      value={{
        currentOfferUser,
        offerAuthLoading,
        isLoggedIn: currentOfferUser !== null,
        login,
        logout,
        // backward-compat aliases
        loginOffer: login,
        logoutOffer: logout,
      }}
    >
      {children}
    </OfferAuthContext.Provider>
  );
}

export function useOfferAuth() {
  return useContext(OfferAuthContext);
}
