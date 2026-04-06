import { Loader2, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { hashPassword, useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { useNavigate } from "../lib/router";

const DEFAULT_PIN = "12345";
const PIN_STORAGE_KEY = "dz_admin_pin";

async function initDefaultPin() {
  if (!localStorage.getItem(PIN_STORAGE_KEY)) {
    const hash = await hashPassword(DEFAULT_PIN);
    localStorage.setItem(PIN_STORAGE_KEY, hash);
  }
}

export default function AdminPinPage() {
  const [digits, setDigits] = useState(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const { actor } = useActor();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  // Initialize default PIN on mount
  useEffect(() => {
    initDefaultPin();
  }, []);

  // Super Admin bypass: skip PIN entirely, go straight to admin panel
  useEffect(() => {
    if (isSuperAdmin) {
      sessionStorage.setItem("adminVerified", "true");
      navigate("/admin");
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    const pin = digits.join("");
    if (pin.length === 5) {
      handleVerify(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleVerify = async (pin: string) => {
    setLoading(true);
    setError(false);
    try {
      const hash = await hashPassword(pin);

      // First check localStorage PIN (primary)
      const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
      let valid = storedHash ? hash === storedHash : false;

      // Fallback: check backend if actor available and local check failed
      if (!valid && actor) {
        try {
          valid = await actor.verifyAdminPin(hash);
        } catch {
          // Backend check failed, rely on local
        }
      }

      if (valid) {
        sessionStorage.setItem("adminVerified", "true");
        toast.success("PIN sahi hai! Welcome Admin.");
        navigate("/admin");
      } else {
        setError(true);
        setDigits(["", "", "", "", ""]);
        refs[0].current?.focus();
        toast.error("Galat PIN");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "PIN verify nahi ho saka");
      setDigits(["", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (i: number, val: string) => {
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

  // Show loading spinner while checking super admin redirect
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
        <div className="bg-emerald-header px-8 py-8 text-center">
          <div className="flex justify-center mb-3">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="font-heading font-bold text-white text-2xl">
            Digital Zindagi Admin
          </h1>
          <p className="text-white/70 text-sm mt-1">5-digit PIN daalein</p>
        </div>

        <div className="px-8 py-8">
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
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-12 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all ${
                  error
                    ? "border-destructive bg-red-50 text-destructive"
                    : d
                      ? "border-primary bg-accent text-foreground"
                      : "border-border text-foreground focus:border-primary"
                }`}
                aria-label={`PIN digit ${i + 1}`}
              />
            ))}
          </div>

          {error && (
            <p
              data-ocid="adminpin.error_state"
              className="text-center text-destructive text-sm font-medium mb-4"
            >
              Galat PIN! Dobara try karein.
            </p>
          )}

          {loading && (
            <div
              data-ocid="adminpin.loading_state"
              className="flex justify-center"
            >
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
