// V147: Admin credentials reset — Temporary Password: 123456, PIN: 12345
const ADMIN_PASSWORD = "123456";
const ADMIN_PIN = "12345";

import { Eye, EyeOff, Loader2, Lock, Mail, Phone, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  SUPER_ADMIN_EMAIL,
  hashPassword,
  useAuth,
} from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { Link, useNavigate } from "../lib/router";
import { UserRole } from "../types/appTypes";

type LoginMode = "mobile" | "email";

// Additional super-admin alternate email
const SUPER_ADMIN_ALT_EMAIL = "sushilkumar12022@gmail.com";

function getLoginErrorMessage(err: unknown): string {
  const msg =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lowerMsg = msg.toLowerCase();

  // ic0.trap / Reject code 5 = wrong password in ICP canister
  if (
    lowerMsg.includes("ic0.trap") ||
    lowerMsg.includes("reject code: 5") ||
    lowerMsg.includes("reject code 5") ||
    lowerMsg.includes("canister trapped") ||
    lowerMsg.includes("trapped explicitly")
  ) {
    return "Incorrect password, please try again";
  }

  // Canister ID pattern (ends with -cai)
  if (/-[a-z0-9]+-cai/i.test(msg)) {
    return "Connection error, please try again";
  }

  if (
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("networkerror") ||
    lowerMsg.includes("network error") ||
    lowerMsg.includes("agenterror")
  ) {
    return "Backend से connect नहीं हो पा रहा, थोड़ा wait करके retry करें";
  }

  if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out")) {
    return "Connection timeout — please try again";
  }

  if (lowerMsg.includes("connect") || lowerMsg.includes("fetch")) {
    return "Backend से connect नहीं हो पा रहा, थोड़ा wait करके retry करें";
  }

  if (
    lowerMsg.includes("not found") ||
    lowerMsg.includes("invalid") ||
    lowerMsg.includes("wrong") ||
    lowerMsg.includes("incorrect") ||
    lowerMsg.includes("mismatch")
  ) {
    return "Incorrect password, please try again";
  }

  return "Something went wrong, please try again";
}

/** Wraps a promise with a 30-second timeout */
function withTimeout<T>(promise: Promise<T>, ms = 30_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "timeout: Connection is taking too long — please try again",
            ),
          ),
        ms,
      ),
    ),
  ]);
}

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("mobile");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretPin, setSecretPin] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { actor } = useActor();
  const navigate = useNavigate();

  // Welcome message from admin settings
  const welcomeMessage =
    localStorage.getItem("dz_welcome_message") ??
    "Digital Zindagi में आपका स्वागत है";

  const emailLower = email.trim().toLowerCase();
  const isSuperAdminEmail =
    emailLower === SUPER_ADMIN_EMAIL.toLowerCase() ||
    emailLower === SUPER_ADMIN_ALT_EMAIL.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "email") {
      if (!email.trim() || !password.trim()) {
        toast.error("Email aur password dono zaroori hain");
        return;
      }

      setLoading(true);
      try {
        // Super Admin — 3-step validation
        if (isSuperAdminEmail) {
          if (password !== ADMIN_PASSWORD) {
            toast.error("गलत Password! सही पासवर्ड डालें।");
            return;
          }
          if (secretPin !== ADMIN_PIN) {
            toast.error("गलत Secret PIN! सही PIN डालें।");
            return;
          }
          login({
            userId: BigInt(0),
            name: "Super Admin",
            role: "admin" as UserRole,
            mobile: "",
            email: SUPER_ADMIN_EMAIL,
            isSuperAdmin: true,
          });
          sessionStorage.setItem("adminVerified", "true");
          toast.success("स्वागत है, Super Admin!");
          navigate("/admin");
          return;
        }

        // Manager email login
        let hash: string;
        try {
          hash = await hashPassword(password);
        } catch (err) {
          toast.error(getLoginErrorMessage(err));
          return;
        }

        const managers: {
          id: string;
          name: string;
          mobile: string;
          email: string;
          password: string;
        }[] = (() => {
          try {
            return JSON.parse(localStorage.getItem("dz_managers") ?? "[]");
          } catch {
            return [];
          }
        })();

        const managerMatch = managers.find(
          (m) =>
            m.email?.toLowerCase() === email.trim().toLowerCase() &&
            m.password === hash,
        );

        if (managerMatch) {
          login({
            userId: BigInt(0),
            name: managerMatch.name,
            role: "manager",
            mobile: managerMatch.mobile,
            email: managerMatch.email,
          });
          toast.success(`स्वागत है, Manager ${managerMatch.name}!`);
          navigate("/manager");
          return;
        }

        toast.error("Email से कोई account नहीं मिला। Mobile से login करें।");
      } catch (err) {
        toast.error(getLoginErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mobile login path
    if (!mobile.trim() || !password.trim()) {
      toast.error("Mobile aur password dono zaroori hain");
      return;
    }
    if (!actor) {
      toast.error("Backend से connect नहीं हो पा रहा, थोड़ा wait करें");
      return;
    }
    setLoading(true);
    try {
      let hash: string;
      try {
        hash = await hashPassword(password);
      } catch (err) {
        toast.error(getLoginErrorMessage(err));
        return;
      }

      const managers: {
        id: string;
        name: string;
        mobile: string;
        email: string;
        password: string;
      }[] = (() => {
        try {
          return JSON.parse(localStorage.getItem("dz_managers") ?? "[]");
        } catch {
          return [];
        }
      })();

      const managerMatch = managers.find(
        (m) => m.mobile === mobile.trim() && m.password === hash,
      );

      if (managerMatch) {
        login({
          userId: BigInt(0),
          name: managerMatch.name,
          role: "manager",
          mobile: managerMatch.mobile,
          email: managerMatch.email,
        });
        toast.success(`स्वागत है, Manager ${managerMatch.name}!`);
        navigate("/manager");
        return;
      }

      const user = await withTimeout(actor.login(mobile.trim(), hash));

      login({
        userId: user.id,
        name: user.name,
        role: user.role,
        mobile: user.mobile ?? "",
        email: undefined,
        isSuperAdmin: false,
      });
      toast.success(`स्वागत है, ${user.name}!`);
      if (user.role === UserRole.admin) navigate("/admin");
      else if (user.role === UserRole.provider) navigate("/provider/dashboard");
      else navigate("/");
    } catch (err) {
      toast.error(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        data-ocid="login.card"
      >
        {/* Header */}
        <div className="bg-emerald-header px-8 py-8">
          <Link
            to="/"
            data-ocid="login.link"
            className="text-white/70 text-sm hover:text-white mb-4 block"
          >
            &larr; वापस जाओ
          </Link>
          {/* Digital Zindagi Logo — round with gold ring */}
          <div className="flex justify-center mb-4">
            <div
              style={{
                background: "#ffffff",
                borderRadius: "50%",
                padding: "4px",
                width: "72px",
                height: "72px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 2.5px #d4af37, 0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              <img
                src="/assets/generated/dz-logo-round-premium-transparent.dim_512x512.png"
                alt="Digital Zindagi Logo"
                style={{
                  width: "60px",
                  height: "60px",
                  objectFit: "contain",
                  borderRadius: "50%",
                  display: "block",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo.png";
                }}
              />
            </div>
          </div>
          <h1 className="font-heading font-bold text-white text-3xl">
            लॉगिन करें
          </h1>
          <p className="text-white/70 text-sm mt-1">{welcomeMessage}</p>
        </div>

        {/* Mode Toggle */}
        <div className="px-8 pt-6 pb-0">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            <button
              type="button"
              data-ocid="login.tab"
              onClick={() => setMode("mobile")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "mobile"
                  ? "bg-white text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone size={14} />
              Mobile से Login
            </button>
            <button
              type="button"
              data-ocid="login.tab"
              onClick={() => setMode("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "email"
                  ? "bg-white text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail size={14} />
              Email से Login
            </button>
          </div>

          {/* Super Admin badge */}
          {mode === "email" && isSuperAdminEmail && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 bg-accent border border-primary/20 rounded-xl px-3 py-2"
            >
              <Star size={14} className="text-primary flex-shrink-0" />
              <p className="text-xs text-primary font-semibold">
                Super Admin — 3-Step Secure Login
              </p>
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {mode === "mobile" ? (
            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="mobile"
              >
                Mobile Number
              </label>
              <input
                id="mobile"
                data-ocid="login.input"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="अपना mobile number डालें"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                autoComplete="tel"
              />
            </div>
          ) : (
            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="login-email"
              >
                Email Address
              </label>
              <input
                id="login-email"
                data-ocid="login.input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address डालें"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                autoComplete="email"
              />
            </div>
          )}

          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1.5"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                data-ocid="login.input"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="अपना password डालें"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mode === "email" && isSuperAdminEmail && (
              <motion.div
                key="secret-pin"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <label
                  className="block text-sm font-medium text-foreground mb-1.5"
                  htmlFor="secret-pin"
                >
                  Secret PIN (सिर्फ Admin के लिए)
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    id="secret-pin"
                    data-ocid="login.input"
                    type="password"
                    inputMode="text"
                    value={secretPin}
                    onChange={(e) => setSecretPin(e.target.value)}
                    placeholder="Secret PIN डालें"
                    className="w-full border border-primary/40 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-accent/30"
                    autoComplete="one-time-code"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            data-ocid="login.submit_button"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "लॉगिन हो रहा है..." : "लॉगिन करें"}
          </button>

          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <Link
              to="/forgot-password"
              data-ocid="login.link"
              className="text-primary hover:underline"
            >
              Password भूल गए?
            </Link>
            <Link
              to="/signup"
              data-ocid="login.link"
              className="text-primary hover:underline"
            >
              Account बनाओ
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
