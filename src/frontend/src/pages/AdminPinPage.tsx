import { Eye, EyeOff, Loader2, Mail, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SUPER_ADMIN_EMAIL, useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { generateAdminToken, setAdminToken } from "../hooks/useAdminSession";
import { useNavigate } from "../lib/router";
import { sanitizeError } from "../utils/errorHandler";

const DEFAULT_PIN = "12345";

type Step = "emailPassword" | "pin";

export default function AdminPinPage() {
  const [step, setStep] = useState<Step>("emailPassword");

  // Email+Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // PIN state
  const [digits, setDigits] = useState(["", "", "", "", ""]);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const { actor } = useActor();
  const navigate = useNavigate();
  const { isSuperAdmin, user } = useAuth();

  // Super Admin bypass: skip both steps
  useEffect(() => {
    if (isSuperAdmin) {
      const token = generateAdminToken(user?.email ?? SUPER_ADMIN_EMAIL);
      setAdminToken(token);
      navigate("/admin");
    }
  }, [isSuperAdmin, navigate, user?.email]);

  // Auto-submit PIN when all 5 digits entered
  useEffect(() => {
    const pin = digits.join("");
    if (pin.length === 5) {
      handleVerifyPin(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  // ---- Step 1: Email + Password ----
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    const trimmedEmail = email.trim().toLowerCase();

    // Only the Super Admin email is allowed
    if (trimmedEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      setEmailError("Sirf Super Admin yahan login kar sakte hain");
      return;
    }

    setEmailLoading(true);
    try {
      let verified = false;
      let sessionToken: string | null = null;

      // Primary: use backend verifyAdminCredentials — it returns Result<{token}, String>
      if (actor) {
        try {
          const result = await (
            actor as unknown as {
              verifyAdminCredentials(
                email: string,
                password: string,
              ): Promise<
                | { __kind__: "ok"; ok: { token: string } }
                | { __kind__: "err"; err: string }
              >;
            }
          ).verifyAdminCredentials(trimmedEmail, password);

          if (result && typeof result === "object" && "__kind__" in result) {
            if ((result as { __kind__: string }).__kind__ === "ok") {
              verified = true;
              const ok = (result as { ok: { token?: string } }).ok;
              sessionToken = ok?.token ?? generateAdminToken(trimmedEmail);
            } else {
              const errMsg =
                (result as { err: string }).err ?? "Invalid credentials";
              // Sanitize raw canister errors
              const lower = errMsg.toLowerCase();
              if (
                lower.includes("unauthorized") ||
                lower.includes("wrong") ||
                lower.includes("invalid") ||
                lower.includes("incorrect") ||
                lower.includes("password")
              ) {
                setEmailError(
                  "Current password galat hai — sahi password dalein",
                );
              } else {
                setEmailError(sanitizeError(new Error(errMsg)));
              }
              return;
            }
          } else {
            // Legacy: backend returned truthy directly
            verified = !!result;
            if (verified) sessionToken = generateAdminToken(trimmedEmail);
          }
        } catch (backendErr) {
          // Backend unavailable or trapped — fall through to local check
          const msg =
            (backendErr as Error)?.message ??
            (typeof backendErr === "string" ? backendErr : "");
          const lower = msg.toLowerCase();
          if (
            lower.includes("unauthorized") ||
            lower.includes("wrong") ||
            lower.includes("incorrect") ||
            lower.includes("ic0.trap") ||
            lower.includes("reject code: 5") ||
            lower.includes("reject code 5")
          ) {
            // Backend explicitly rejected — wrong password
            setEmailError("Current password galat hai — sahi password dalein");
            return;
          }
          // Network/method error — try local fallback
        }
      }

      // Fallback: local password check against known admin password
      if (!verified) {
        const ADMIN_PWD = "admin123@";
        verified = password === ADMIN_PWD;
        if (verified) sessionToken = generateAdminToken(trimmedEmail);
      }

      if (!verified) {
        setEmailError("Current password galat hai — sahi password dalein");
        return;
      }

      // Verified — store session token and go to dashboard
      setAdminToken(sessionToken ?? generateAdminToken(trimmedEmail));
      sessionStorage.setItem("dz_admin_email", trimmedEmail);
      toast.success("Admin verified ✓ Welcome!");
      navigate("/admin");
    } catch (err) {
      setEmailError(sanitizeError(err));
    } finally {
      setEmailLoading(false);
    }
  };

  // ---- Step 2: PIN (fallback step — reached only in non-super-admin flow) ----
  const handleVerifyPin = async (pin: string) => {
    setPinLoading(true);
    setPinError(false);
    try {
      let valid = pin === DEFAULT_PIN;

      if (!valid && actor) {
        try {
          valid = await actor.verifyAdminPin(pin);
        } catch {
          // fallback to local
        }
      }

      if (valid) {
        // Set admin token so CPAGrip and other admin methods can authenticate
        const pinToken = generateAdminToken(SUPER_ADMIN_EMAIL);
        setAdminToken(pinToken);
        // Also set dz_admin_email for reference
        sessionStorage.setItem("dz_admin_email", SUPER_ADMIN_EMAIL);
        toast.success("PIN sahi hai! Welcome Admin.");
        navigate("/admin");
      } else {
        setPinError(true);
        setDigits(["", "", "", "", ""]);
        refs[0].current?.focus();
        toast.error("Galat PIN — dobara try karein");
      }
    } catch (err) {
      toast.error(sanitizeError(err));
      setDigits(["", "", "", "", ""]);
    } finally {
      setPinLoading(false);
    }
  };

  const handleDigitChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (digit && i < 4) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  };

  // Loading spinner while super admin redirect happens
  if (isSuperAdmin) {
    return (
      <div className="min-h-screen bg-emerald-hero flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm"
        data-ocid="adminpin.card"
      >
        {/* Header */}
        <div className="bg-emerald-header px-8 py-8 text-center">
          <div className="flex justify-center mb-3">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="font-heading font-bold text-white text-2xl">
            Digital Zindagi Admin
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {step === "emailPassword"
              ? "Admin credentials daalein"
              : "5-digit PIN daalein"}
          </p>
        </div>

        <div className="px-8 py-8">
          {/* Step 1: Email + Password */}
          {step === "emailPassword" && (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleEmailPasswordSubmit}
              className="space-y-4"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Admin Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="admin-email"
                    type="email"
                    data-ocid="adminpin.email_input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="sushhilkumar651@gmail.com"
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPwd ? "text" : "password"}
                    data-ocid="adminpin.password_input"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 pr-10 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {emailError && (
                <p
                  data-ocid="adminpin.error_state"
                  className="text-destructive text-sm font-medium text-center"
                >
                  {emailError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                data-ocid="adminpin.submit_button"
                disabled={emailLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {emailLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {emailLoading ? "Verify ho raha hai..." : "Admin Login"}
              </button>
            </motion.form>
          )}

          {/* Step 2: PIN */}
          {step === "pin" && (
            <motion.div
              key="pin-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex justify-center gap-2 mb-6">
                {digits.map((d, i) => (
                  <input
                    // biome-ignore lint/suspicious/noArrayIndexKey: PIN digit positions are fixed
                    key={i}
                    ref={refs[i]}
                    data-ocid="adminpin.input"
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`w-12 h-12 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all ${
                      pinError
                        ? "border-destructive bg-red-50 text-destructive"
                        : d
                          ? "border-primary bg-accent text-foreground"
                          : "border-border text-foreground focus:border-primary"
                    }`}
                    aria-label={`PIN digit ${i + 1}`}
                  />
                ))}
              </div>

              {pinError && (
                <p
                  data-ocid="adminpin.pin_error_state"
                  className="text-center text-destructive text-sm font-medium mb-4"
                >
                  Galat PIN! Dobara try karein.
                </p>
              )}

              {pinLoading && (
                <div
                  data-ocid="adminpin.loading_state"
                  className="flex justify-center"
                >
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setStep("emailPassword");
                  setDigits(["", "", "", "", ""]);
                  setPinError(false);
                }}
                className="mt-4 w-full text-sm text-muted-foreground underline text-center"
              >
                ← Wapas jaayein
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
