import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { hashPassword, useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "../lib/router";

interface StoredManager {
  id: string;
  name: string;
  mobile: string;
  email: string;
  password: string;
}

export default function ManagerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check if manager login is disabled by owner
    if (localStorage.getItem("dz_manager_login_enabled") === "false") {
      toast.error("Manager login filhaal band hai. Owner se contact karein.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error("Email aur password dono zaroori hain");
      return;
    }
    setLoading(true);
    try {
      const hash = await hashPassword(password);
      const managers: StoredManager[] = (() => {
        try {
          return JSON.parse(localStorage.getItem("dz_managers") ?? "[]");
        } catch {
          return [];
        }
      })();

      const match = managers.find(
        (m) =>
          m.email?.toLowerCase() === email.trim().toLowerCase() &&
          m.password === hash,
      );

      if (!match) {
        toast.error("Email ya password galat hai");
        return;
      }

      login({
        userId: BigInt(0),
        name: match.name,
        role: "manager",
        mobile: match.mobile,
        email: match.email,
      });
      toast.success(`Welcome, Manager ${match.name}!`);
      navigate("/manager");
    } catch (err: any) {
      toast.error(err?.message ?? "Login fail ho gaya");
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
        data-ocid="manager_login.card"
      >
        <div className="bg-emerald-header px-8 py-8">
          <Link
            to="/"
            data-ocid="manager_login.link"
            className="text-white/70 text-sm hover:text-white mb-4 block"
          >
            &larr; वापस जाओ
          </Link>
          <div className="flex flex-col items-center text-center gap-3">
            {/* Round logo with gold ring */}
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
            <div>
              <h1 className="font-heading font-bold text-white text-2xl">
                Staff Login
              </h1>
              <p className="text-white/70 text-sm">
                Digital Zindagi — Manager Portal
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          <div>
            <label
              htmlFor="manager-email"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Email Address
            </label>
            <input
              id="manager-email"
              data-ocid="manager_login.input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@example.com"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="manager-password"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="manager-password"
                data-ocid="manager_login.input"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Apna password daalein"
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

          <button
            type="submit"
            data-ocid="manager_login.submit_button"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Login Ho Raha Hai..." : "Manager Login"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Regular user?{" "}
            <Link
              to="/login"
              data-ocid="manager_login.link"
              className="text-primary hover:underline"
            >
              Main Login par jao
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
