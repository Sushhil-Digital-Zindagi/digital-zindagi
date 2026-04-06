import {
  Briefcase,
  Crown,
  Eye,
  EyeOff,
  LocateFixed,
  QrCode,
  Tv2,
  User2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { ALL_CATEGORIES } from "../components/CategoryGrid";
import { SUPER_ADMIN_EMAIL } from "../contexts/AuthContext";
import { useAdminConfig } from "../hooks/useQueries";
import { Link, useNavigate } from "../lib/router";

const SECURITY_QUESTIONS = [
  "Best Friend Ka Naam",
  "Maa Ka Naam",
  "Pet Ka Naam",
  "Favourite City",
  "School Ka Naam",
];

// Merge static + admin-created categories
function getCategories(): { name: string; emoji: string }[] {
  const staticCats = ALL_CATEGORIES.map((c) => ({
    name: c.name,
    emoji: c.emoji,
  }));
  try {
    const custom = JSON.parse(
      localStorage.getItem("dz_categories") ?? "[]",
    ) as {
      name: string;
      emoji: string;
    }[];
    const existing = new Set(staticCats.map((c) => c.name.toLowerCase()));
    const merged = [
      ...staticCats,
      ...custom.filter((c) => !existing.has(c.name.toLowerCase())),
    ];
    return merged;
  } catch {
    return staticCats;
  }
}

function saveProviderToLocalStorage(provider: {
  id: string;
  name: string;
  mobile: string;
  category: string;
  planType: string;
  status: string;
  createdAt: string;
  email: string;
  address: string;
  lat?: number;
  lng?: number;
}) {
  const existing: (typeof provider)[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("dz_providers") ?? "[]");
    } catch {
      return [];
    }
  })();
  existing.push(provider);
  localStorage.setItem("dz_providers", JSON.stringify(existing));
}

export default function SignupPage() {
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [secQ, setSecQ] = useState(SECURITY_QUESTIONS[0]);
  const [secA, setSecA] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shopLat, setShopLat] = useState<number | null>(null);
  const [shopLng, setShopLng] = useState<number | null>(null);
  const [detectingGPS, setDetectingGPS] = useState(false);

  const handleDetectShopLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Aapka browser GPS support nahi karta");
      return;
    }
    setDetectingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setShopLat(pos.coords.latitude);
        setShopLng(pos.coords.longitude);
        setDetectingGPS(false);
        toast.success(
          `✅ Location detect ho gayi! (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`,
        );
      },
      (err) => {
        setDetectingGPS(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(
            "Location permission den zaroori hai — browser settings check karein",
          );
        } else {
          toast.error("GPS se location nahi mili, dobara try karein");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const { data: adminConfig } = useAdminConfig();
  const navigate = useNavigate();
  const categories = getCategories();

  // Welcome message from admin settings
  const welcomeMessage =
    localStorage.getItem("dz_welcome_message") ??
    "Digital Zindagi family mein shamil ho";

  // Admin QR toggle
  const showRegistrationQR = (() => {
    try {
      const val = localStorage.getItem("dz_show_registration_qr");
      return val === null ? true : val === "true";
    } catch {
      return true;
    }
  })();

  const validate = (): boolean => {
    if (!name.trim()) {
      toast.error("Naam bharna zaroori hai");
      return false;
    }
    if (!mobile.trim()) {
      toast.error("Mobile number bharna zaroori hai");
      return false;
    }
    if (!password) {
      toast.error("Password bharna zaroori hai");
      return false;
    }
    if (password !== confirmPwd) {
      toast.error("Passwords match nahi kar rahe");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password kam se kam 6 characters ka hona chahiye");
      return false;
    }
    if (!secA.trim()) {
      toast.error("Security answer bharna zaroori hai");
      return false;
    }
    if (role === "provider" && !category) {
      toast.error("Provider ke liye category select karna zaroori hai");
      return false;
    }
    return true;
  };

  const handleProviderSubmit = (planType: "pending_premium" | "free") => {
    if (!validate()) return;
    setSubmitting(true);

    const providerData = {
      id: Date.now().toString(),
      name: name.trim(),
      mobile: mobile.trim(),
      category,
      planType,
      status: "pending",
      createdAt: new Date().toISOString(),
      email: email.trim() || "",
      address: "",
      lat: shopLat ?? undefined,
      lng: shopLng ?? undefined,
    };

    saveProviderToLocalStorage(providerData);

    setTimeout(() => {
      setSubmitting(false);
      if (planType === "pending_premium") {
        toast.success(
          "Registration Successful! Admin will approve you soon. 🎉",
        );
        navigate("/provider/subscribe");
      } else {
        toast.success(
          "Registration Successful! Admin will approve you soon. 🎉",
        );
        navigate("/provider/dashboard");
      }
    }, 400);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !password || !secA.trim()) {
      toast.error("Sab fields bharna zaroori hai");
      return;
    }
    if (password !== confirmPwd) {
      toast.error("Passwords match nahi kar rahe");
      return;
    }
    if (password.length < 6) {
      toast.error("Password kam se kam 6 characters ka hona chahiye");
      return;
    }

    const isSuperAdmin =
      email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (isSuperAdmin) {
      navigate("/admin");
      return;
    }
    toast.success("Account ban gaya!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-emerald-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-emerald-header px-8 py-7">
          <Link
            to="/"
            className="text-white/70 text-sm hover:text-white mb-3 block"
          >
            &larr; Wapas Jao
          </Link>
          <h1 className="font-heading font-bold text-white text-3xl">
            Account Banao
          </h1>
          <p className="text-white/70 text-sm mt-1">{welcomeMessage}</p>
        </div>

        <form onSubmit={handleCustomerSubmit} className="px-8 py-7 space-y-5">
          {/* Role selector */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Aap kaun hain?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-ocid="signup.toggle"
                onClick={() => setRole("customer")}
                className={`flex items-center gap-2 justify-center p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                  role === "customer"
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <User2 size={16} /> Customer
              </button>
              <button
                type="button"
                data-ocid="signup.toggle"
                onClick={() => setRole("provider")}
                className={`flex items-center gap-2 justify-center p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                  role === "provider"
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Briefcase size={16} /> Provider
              </button>
            </div>
          </div>

          {/* Category dropdown — only for providers */}
          {role === "provider" && (
            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="service-category"
              >
                Service Category <span className="text-destructive">*</span>
              </label>
              <select
                id="service-category"
                data-ocid="signup.select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                required
              >
                <option value="" disabled>
                  Category chunein...
                </option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1.5"
              htmlFor="name"
            >
              Pura Naam
            </label>
            <input
              id="name"
              data-ocid="signup.input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apna naam daalein"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoComplete="name"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1.5"
              htmlFor="mobile"
            >
              Mobile Number
            </label>
            <input
              id="mobile"
              data-ocid="signup.input"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10 digit mobile number"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoComplete="tel"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1.5"
              htmlFor="signup-email"
            >
              Email (Optional)
            </label>
            <input
              id="signup-email"
              data-ocid="signup.input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address (optional)"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="pwd"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="pwd"
                  data-ocid="signup.input"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="cpwd"
              >
                Confirm Password
              </label>
              <input
                id="cpwd"
                data-ocid="signup.input"
                type={showPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Dobara daalein"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1.5"
              htmlFor="secq"
            >
              Security Question
            </label>
            <select
              id="secq"
              data-ocid="signup.select"
              value={secQ}
              onChange={(e) => setSecQ(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
            >
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1.5"
              htmlFor="seca"
            >
              Security Answer
            </label>
            <input
              id="seca"
              data-ocid="signup.input"
              type="text"
              value={secA}
              onChange={(e) => setSecA(e.target.value)}
              placeholder="Jawab likhein"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Registration QR from admin config */}
          {showRegistrationQR && adminConfig?.qrCodeBlobId && (
            <div className="bg-accent rounded-2xl p-4 text-center">
              <p className="text-sm font-medium text-foreground mb-1">
                <QrCode
                  size={14}
                  className="inline mr-1.5 -mt-0.5 text-primary"
                />
                Subscription Payment QR
              </p>
              <img
                src={adminConfig.qrCodeBlobId.getDirectURL()}
                alt="Admin UPI QR"
                className="w-32 h-32 mx-auto object-contain"
              />
              {adminConfig.upiId && (
                <p className="text-xs text-muted-foreground mt-1">
                  UPI: {adminConfig.upiId}
                </p>
              )}
            </div>
          )}

          {/* GPS Shop Location Button — only for providers */}
          {role === "provider" && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                <LocateFixed size={15} /> Apni Dukaan Ki Location Set Karein
              </p>
              <p className="text-xs text-blue-600 mb-3">
                Apni dukaan par khade hokar neeche ka button dabayein — GPS se
                exact location save ho jaayegi.
              </p>
              <button
                type="button"
                data-ocid="signup.location_button"
                onClick={handleDetectShopLocation}
                disabled={detectingGPS}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                <LocateFixed size={15} />
                {detectingGPS
                  ? "GPS se Location Dhundh Raha Hai..."
                  : "Detect My Shop Location"}
              </button>
              {shopLat !== null && shopLng !== null && (
                <p className="text-xs text-green-700 font-semibold mt-2 text-center">
                  ✅ Location Saved: {shopLat.toFixed(5)}, {shopLng.toFixed(5)}
                </p>
              )}
            </div>
          )}

          {/* Submit buttons — two for provider, one for customer */}
          {role === "provider" ? (
            <div>
              <p className="text-xs text-center text-muted-foreground mb-3 font-medium">
                Account register karke apna plan chunein:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Subscription Lege — Premium */}
                <button
                  type="button"
                  data-ocid="signup.primary_button"
                  disabled={submitting}
                  onClick={() => handleProviderSubmit("pending_premium")}
                  className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
                >
                  <Crown size={15} />
                  Subscription Lege
                </button>

                {/* Ads Dekhe — Free */}
                <button
                  type="button"
                  data-ocid="signup.secondary_button"
                  disabled={submitting}
                  onClick={() => handleProviderSubmit("free")}
                  className="w-full bg-slate-100 text-slate-700 border border-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
                >
                  <Tv2 size={15} />
                  Ads Dekhe
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <p className="text-xs text-center text-emerald-600 font-medium">
                  👑 Premium — No Ads
                </p>
                <p className="text-xs text-center text-slate-500">
                  📺 Free — Ads Chalenge
                </p>
              </div>

              {/* Success message area */}
              {submitting && (
                <div
                  data-ocid="signup.loading_state"
                  className="mt-3 text-center text-sm text-primary font-medium"
                >
                  Registration ho raha hai...
                </div>
              )}
            </div>
          ) : (
            <button
              type="submit"
              data-ocid="signup.submit_button"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? "Account Ban Raha Hai..." : "Account Banao"}
            </button>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Pehle se account hai?{" "}
            <Link
              to="/login"
              className="text-primary font-semibold hover:underline"
            >
              Login Karein
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
