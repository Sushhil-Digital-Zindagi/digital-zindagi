// ============================================================
// Offer Auth Context — completely isolated from main AuthContext
// Session stored in sessionStorage under "offer_session"
// with 7-day rolling expiry.
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

const OFFER_SESSION_KEY = "offer_session";
const OFFER_SESSION_EXPIRY_KEY = "offer_session_expiry";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StoredOfferSession {
  id: string;
  userId: string;
  email: string;
  referralCode: string;
  referredBy?: string;
  totalEarnings: string;
  pendingEarnings: string;
  createdAt: string;
}

function serializeOfferUser(user: OfferUser): StoredOfferSession {
  return {
    id: user.id.toString(),
    userId: user.userId,
    email: user.email,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    totalEarnings: user.totalEarnings.toString(),
    pendingEarnings: user.pendingEarnings.toString(),
    createdAt: user.createdAt.toString(),
  };
}

function deserializeOfferUser(s: StoredOfferSession): OfferUser {
  return {
    id: BigInt(s.id),
    userId: s.userId,
    email: s.email,
    referralCode: s.referralCode,
    referredBy: s.referredBy,
    totalEarnings: BigInt(s.totalEarnings),
    pendingEarnings: BigInt(s.pendingEarnings),
    createdAt: BigInt(s.createdAt),
  };
}

interface OfferAuthContextType {
  currentOfferUser: OfferUser | null;
  offerAuthLoading: boolean;
  loginOffer: (user: OfferUser) => void;
  logoutOffer: () => void;
}

const OfferAuthContext = createContext<OfferAuthContextType>({
  currentOfferUser: null,
  offerAuthLoading: true,
  loginOffer: () => {},
  logoutOffer: () => {},
});

export function OfferAuthProvider({ children }: { children: ReactNode }) {
  const [currentOfferUser, setCurrentOfferUser] = useState<OfferUser | null>(
    null,
  );
  const [offerAuthLoading, setOfferAuthLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(OFFER_SESSION_KEY);
      const expiry = sessionStorage.getItem(OFFER_SESSION_EXPIRY_KEY);
      if (stored && expiry && Date.now() < Number(expiry)) {
        const parsed = JSON.parse(stored) as StoredOfferSession;
        setCurrentOfferUser(deserializeOfferUser(parsed));
        // Sliding window refresh
        sessionStorage.setItem(
          OFFER_SESSION_EXPIRY_KEY,
          String(Date.now() + SESSION_DURATION_MS),
        );
      } else {
        sessionStorage.removeItem(OFFER_SESSION_KEY);
        sessionStorage.removeItem(OFFER_SESSION_EXPIRY_KEY);
      }
    } catch {
      sessionStorage.removeItem(OFFER_SESSION_KEY);
      sessionStorage.removeItem(OFFER_SESSION_EXPIRY_KEY);
    } finally {
      setOfferAuthLoading(false);
    }
  }, []);

  const loginOffer = useCallback((user: OfferUser) => {
    setCurrentOfferUser(user);
    sessionStorage.setItem(
      OFFER_SESSION_KEY,
      JSON.stringify(serializeOfferUser(user)),
    );
    sessionStorage.setItem(
      OFFER_SESSION_EXPIRY_KEY,
      String(Date.now() + SESSION_DURATION_MS),
    );
  }, []);

  const logoutOffer = useCallback(() => {
    setCurrentOfferUser(null);
    sessionStorage.removeItem(OFFER_SESSION_KEY);
    sessionStorage.removeItem(OFFER_SESSION_EXPIRY_KEY);
  }, []);

  return (
    <OfferAuthContext.Provider
      value={{ currentOfferUser, offerAuthLoading, loginOffer, logoutOffer }}
    >
      {children}
    </OfferAuthContext.Provider>
  );
}

export function useOfferAuth() {
  return useContext(OfferAuthContext);
}
