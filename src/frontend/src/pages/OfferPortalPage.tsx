import {
  ArrowLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Gift,
  LogOut,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
/**
 * Digital Zindagi Offer Portal
 * Isolated earning portal with its own login/signup and ID system.
 * All data is sourced from the backend actor — no localStorage primary storage.
 */
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useOfferAuth } from "../contexts/OfferAuthContext";
import {
  useLoginOfferUser,
  useMyOfferTransactions,
  useMyOfferWithdrawals,
  useOfferEarningsSummary,
  useOfferPortalConfig,
  useRegisterOfferUser,
  useRequestOfferWithdrawal,
} from "../hooks/useOfferQueries";
import { useNavigate } from "../lib/router";
import type { OfferTransaction, OfferWithdrawal } from "../types/offerTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "landing" | "login" | "signup" | "dashboard" | "redeem";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 flex flex-col gap-2 ${
        accent
          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-emerald-900"
          : "bg-card border border-border"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          accent ? "bg-white/30" : "bg-emerald-50"
        }`}
      >
        <span className={accent ? "text-emerald-900" : "text-emerald-600"}>
          {icon}
        </span>
      </div>
      <p
        className={`font-extrabold text-xl leading-none ${accent ? "text-emerald-900" : "text-foreground"}`}
      >
        {value}
      </p>
      <p
        className={`text-xs font-medium ${accent ? "text-emerald-800/80" : "text-muted-foreground"}`}
      >
        {label}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfferPortalPage() {
  const navigate = useNavigate();
  const { currentOfferUser, offerAuthLoading, loginOffer, logoutOffer } =
    useOfferAuth();

  const [view, setView] = useState<View>(() =>
    currentOfferUser ? "dashboard" : "landing",
  );

  const { data: config } = useOfferPortalConfig();

  const handleLogout = () => {
    logoutOffer();
    setView("landing");
    toast.success("Logout successful");
  };

  // Show loading state while session is being restored
  if (offerAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-primary text-sm">Load ho raha hai...</span>
      </div>
    );
  }

  // Portal disabled by admin
  if (config && !config.isEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center gap-4">
        <span className="text-5xl">🔒</span>
        <h2 className="font-heading font-bold text-xl text-foreground">
          Offer Portal Abhi Unavailable Hai
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Admin ne filhaal is portal ko band kiya hua hai. Baad mein dobara try
          karein.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-2 flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
        >
          <ArrowLeft size={15} /> Wapas Jao
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border shadow-sm"
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft size={16} />
          Home
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🚀
          </span>
          <span className="font-heading font-bold text-white text-base">
            DZ Offer Portal
          </span>
        </div>
        {currentOfferUser ? (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium"
            aria-label="Logout"
          >
            <LogOut size={14} /> Logout
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === "landing" && (
          <LandingView
            key="landing"
            onLogin={() => setView("login")}
            onSignup={() => setView("signup")}
          />
        )}
        {view === "login" && (
          <LoginView
            key="login"
            onSuccess={(user) => {
              loginOffer(user);
              setView("dashboard");
            }}
            onSignup={() => setView("signup")}
            onBack={() => setView("landing")}
          />
        )}
        {view === "signup" && (
          <SignupView
            key="signup"
            onSuccess={(user) => {
              loginOffer(user);
              setView("dashboard");
            }}
            onLogin={() => setView("login")}
            onBack={() => setView("landing")}
          />
        )}
        {view === "dashboard" && currentOfferUser && (
          <DashboardView key="dashboard" onRedeem={() => setView("redeem")} />
        )}
        {view === "redeem" && currentOfferUser && (
          <RedeemView key="redeem" onBack={() => setView("dashboard")} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Landing ─────────────────────────────────────────────────────────────────

function LandingView({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  const features = [
    {
      icon: "💰",
      title: "60% Profit Share",
      desc: "Har conversion ka 60% seedha aapke wallet mein",
    },
    {
      icon: "👥",
      title: "1% Referral Bonus",
      desc: "Dost ko refer karo aur unki kamai ka 1% paao — automatically",
    },
    {
      icon: "📱",
      title: "UPI Withdrawal",
      desc: "Kamaai sidha aapke UPI account mein",
    },
    {
      icon: "🔒",
      title: "Secure & Verified",
      desc: "Admin-approved payout system",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col"
    >
      {/* Hero */}
      <div
        className="px-6 py-12 text-center flex flex-col items-center gap-4"
        style={{
          background:
            "linear-gradient(180deg, #064e3b 0%, #065f46 60%, #f9fafb 100%)",
        }}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 280 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-xl"
        >
          <span className="text-4xl" aria-hidden>
            🚀
          </span>
        </motion.div>
        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-heading font-extrabold text-white text-3xl leading-tight"
        >
          Digital Zindagi
          <br />
          <span className="text-amber-300">Offer Portal</span>
        </motion.h1>
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="text-white/75 text-base max-w-xs leading-relaxed"
        >
          Ghar baithe kamaao! Har conversion par{" "}
          <strong className="text-amber-300">60%</strong> profit seedha aapke
          wallet mein.
        </motion.p>
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-3 mt-2 w-full max-w-xs"
        >
          <button
            type="button"
            data-ocid="offer_portal.signup_button"
            onClick={onSignup}
            className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-emerald-900 font-extrabold py-3.5 rounded-xl shadow-lg hover:from-amber-500 hover:to-yellow-600 transition-all text-sm"
          >
            Join Free
          </button>
          <button
            type="button"
            data-ocid="offer_portal.login_button"
            onClick={onLogin}
            className="flex-1 bg-white/15 text-white font-bold py-3.5 rounded-xl hover:bg-white/25 transition-all text-sm border border-white/20"
          >
            Login
          </button>
        </motion.div>
      </div>

      {/* Features */}
      <div className="px-4 py-8 bg-background flex-1">
        <h2 className="font-heading font-bold text-center text-foreground text-lg mb-5">
          Kyun Join Karein?
        </h2>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.4 }}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
            >
              <span className="text-2xl" aria-hidden>
                {f.icon}
              </span>
              <p className="font-bold text-foreground text-sm">{f.title}</p>
              <p className="text-muted-foreground text-xs leading-snug">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 max-w-md mx-auto bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl mt-0.5" aria-hidden>
            ℹ️
          </span>
          <p className="text-emerald-800 text-xs leading-relaxed">
            Yeh portal Digital Zindagi ke main account se bilkul alag hai — iska
            apna login, apna ID, aur apna wallet hai.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginView({
  onSuccess,
  onSignup,
  onBack,
}: {
  onSuccess: (user: import("../types/offerTypes").OfferUser) => void;
  onSignup: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLoginOfferUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email daalo");
      return;
    }
    if (!password.trim()) {
      toast.error("Password daalo");
      return;
    }
    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (user) => {
          toast.success("Welcome back! 🎉");
          onSuccess(user);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Email ya password galat hai",
          );
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="flex-1 px-4 py-8 max-w-md mx-auto w-full"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl" aria-hidden>
            🚀
          </span>
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground">
          Offer Portal Login
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Apna account access karein
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="op-email"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Email
          </label>
          <input
            id="op-email"
            data-ocid="offer_portal.input"
            type="email"
            placeholder="aapka@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            required
          />
        </div>
        <div>
          <label
            htmlFor="op-password"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Password
          </label>
          <input
            id="op-password"
            data-ocid="offer_portal.input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            required
          />
        </div>
        <button
          type="submit"
          data-ocid="offer_portal.submit_button"
          disabled={loginMutation.isPending}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-60 text-sm shadow-md"
        >
          {loginMutation.isPending ? "Checking..." : "Login Karein →"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Account nahi hai?{" "}
        <button
          type="button"
          data-ocid="offer_portal.link"
          onClick={onSignup}
          className="text-primary font-semibold hover:underline"
        >
          Join Free
        </button>
      </p>
    </motion.div>
  );
}

// ─── Signup ───────────────────────────────────────────────────────────────────

function SignupView({
  onSuccess,
  onLogin,
  onBack,
}: {
  onSuccess: (user: import("../types/offerTypes").OfferUser) => void;
  onLogin: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref") ?? "";
  });
  const registerMutation = useRegisterOfferUser();
  const loginMutation = useLoginOfferUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email daalo");
      return;
    }
    if (!password.trim() || password.length < 6) {
      toast.error("Password kam se kam 6 characters ka hona chahiye");
      return;
    }

    registerMutation.mutate(
      {
        email: email.trim(),
        password,
        referralCode: referralCode.trim().toUpperCase() || undefined,
      },
      {
        onSuccess: () => {
          // After registration, log in immediately
          loginMutation.mutate(
            { email: email.trim(), password },
            {
              onSuccess: (user) => {
                toast.success(`Welcome! ID: DZ-${user.id} 🎉`);
                onSuccess(user);
              },
              onError: () => {
                toast.success("Account ban gaya! Ab login karein.");
                onLogin();
              },
            },
          );
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Account banana fail hua. Dobara try karein.",
          );
        },
      },
    );
  };

  const isLoading = registerMutation.isPending || loginMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="flex-1 px-4 py-8 max-w-md mx-auto w-full"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl" aria-hidden>
            🎯
          </span>
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground">
          Free mein Join Karein
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Unique DZ Offer ID milega
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="op-signup-email"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Email *
          </label>
          <input
            id="op-signup-email"
            data-ocid="offer_portal.input"
            type="email"
            placeholder="aapka@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            required
          />
        </div>
        <div>
          <label
            htmlFor="op-signup-password"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Password * (min 6 chars)
          </label>
          <input
            id="op-signup-password"
            data-ocid="offer_portal.input"
            type="password"
            placeholder="Strong password banayein"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            required
          />
        </div>
        <div>
          <label
            htmlFor="op-referral"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Referral Code (Optional)
          </label>
          <input
            id="op-referral"
            data-ocid="offer_portal.input"
            type="text"
            placeholder="Kisi ka referral code hai?"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background font-mono"
          />
        </div>
        <button
          type="submit"
          data-ocid="offer_portal.submit_button"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-emerald-900 font-extrabold py-3.5 rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all disabled:opacity-60 text-sm shadow-md mt-1"
        >
          {isLoading ? "Creating Account..." : "Join & Earn Now →"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        Account hai?{" "}
        <button
          type="button"
          data-ocid="offer_portal.link"
          onClick={onLogin}
          className="text-primary font-semibold hover:underline"
        >
          Login Karein
        </button>
      </p>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({ onRedeem }: { onRedeem: () => void }) {
  const { currentOfferUser } = useOfferAuth();
  const offerUserId = currentOfferUser?.id ?? null;

  const { data: summary, isLoading: summaryLoading } =
    useOfferEarningsSummary(offerUserId);
  const { data: transactions = [] } = useMyOfferTransactions(offerUserId);
  const { data: withdrawals = [] } = useMyOfferWithdrawals(offerUserId);

  const pendingWithdrawalTotal = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + w.amount, 0n);

  const referralCode =
    summary?.referralCode ?? currentOfferUser?.referralCode ?? "";
  const referralUrl = `${window.location.origin}/offer-portal?ref=${referralCode}`;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success("Referral link copy ho gaya! 📋");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleShareReferral = async () => {
    const shareData = {
      title: "Digital Zindagi Offer Portal",
      text: `Ghar baithe kamaao! Mere referral code se join karo: ${referralCode}`,
      url: referralUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        handleCopyReferral();
      }
    } else {
      handleCopyReferral();
    }
  };

  const totalEarnings = summary?.totalEarnings ?? 0n;
  const pendingEarnings = summary?.pendingEarnings ?? 0n;

  function formatRupees(amount: bigint): string {
    return `₹${(Number(amount) / 100).toFixed(2)}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-5"
    >
      {/* Welcome */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
          {(currentOfferUser?.email ?? "U").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-bold text-foreground text-lg leading-tight truncate">
            Namaste! 👋
          </h2>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {currentOfferUser?.email}
          </p>
        </div>
        {summaryLoading && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            Refresh...
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Wallet size={18} />}
          label="Pending Earnings"
          value={formatRupees(pendingEarnings)}
          accent
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Total Earned"
          value={formatRupees(totalEarnings)}
        />
        <StatCard
          icon={<Users size={18} />}
          label="Referral Bonus"
          value={`${transactions.filter((t) => t.txType === "referralBonus").length} txns`}
        />
        <StatCard
          icon={<CircleDollarSign size={18} />}
          label="Pending Withdrawal"
          value={formatRupees(pendingWithdrawalTotal)}
        />
      </div>

      {/* Redeem */}
      <button
        type="button"
        data-ocid="offer_portal.redeem_button"
        onClick={onRedeem}
        className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold px-5 py-4 rounded-2xl shadow-lg hover:from-emerald-700 hover:to-emerald-600 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Gift size={18} />
          </div>
          <div className="text-left">
            <p className="text-sm font-extrabold leading-none">
              Redeem Earnings
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              UPI/Bank withdrawal request
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-white/70" />
      </button>

      {/* Referral Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-amber-500" />
          <h3 className="font-bold text-foreground text-sm">
            Apna Referral Code
          </h3>
        </div>
        <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <span className="font-mono font-bold text-foreground text-base tracking-widest">
            {referralCode || "Loading..."}
          </span>
          <button
            type="button"
            data-ocid="offer_portal.copy_button"
            onClick={handleCopyReferral}
            className="p-2 rounded-lg hover:bg-border transition-colors"
            aria-label="Copy referral code"
          >
            <Copy size={15} className="text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Har referred user ki kamai ka{" "}
          <strong className="text-foreground">1%</strong> automatically aapke
          wallet mein aa jaata hai — CPALead postback ke through.
        </p>
        <button
          type="button"
          data-ocid="offer_portal.share_button"
          onClick={handleShareReferral}
          className="w-full flex items-center justify-center gap-2 border border-primary/40 text-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/5 transition-colors"
        >
          <ExternalLink size={14} />
          Share Referral Link
        </button>
      </div>

      {/* Earnings List */}
      <div>
        <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={15} className="text-emerald-600" /> Recent Earnings
        </h3>
        {transactions.length === 0 ? (
          <div
            data-ocid="offer_portal.empty_state"
            className="bg-card border border-border rounded-2xl p-8 text-center"
          >
            <p className="text-3xl mb-2">💰</p>
            <p className="text-muted-foreground text-sm font-medium">
              Abhi koi earning nahi
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Offer complete karo ya dosto ko refer karo
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions
              .slice()
              .reverse()
              .slice(0, 10)
              .map((entry: OfferTransaction) => (
                <div
                  key={entry.id.toString()}
                  data-ocid="offer_portal.earning_row"
                  className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm" aria-hidden>
                        {entry.txType === "cpalead"
                          ? "💰"
                          : entry.txType === "referralBonus"
                            ? "👥"
                            : "🎁"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {entry.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          Number(entry.createdAt) / 1_000_000,
                        ).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <span className="text-emerald-600 font-bold text-sm flex-shrink-0">
                    +{formatRupees(entry.amount)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Withdrawals */}
      {withdrawals.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground text-sm mb-3">
            Withdrawal History
          </h3>
          <div className="space-y-2">
            {withdrawals
              .slice()
              .reverse()
              .slice(0, 5)
              .map((w: OfferWithdrawal) => (
                <div
                  key={w.id.toString()}
                  data-ocid="offer_portal.withdrawal_row"
                  className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatRupees(w.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.upiId}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      w.status === "approved" || w.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : w.status === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {w.status === "approved"
                      ? "✅ Approved"
                      : w.status === "paid"
                        ? "✅ Paid"
                        : w.status === "rejected"
                          ? "❌ Rejected"
                          : "⏳ Pending"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Redeem ───────────────────────────────────────────────────────────────────

function RedeemView({ onBack }: { onBack: () => void }) {
  const { currentOfferUser } = useOfferAuth();
  const offerUserId = currentOfferUser?.id ?? null;

  const { data: summary } = useOfferEarningsSummary(offerUserId);
  const withdrawalMutation = useRequestOfferWithdrawal();

  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");

  // Minimum withdrawal in paisa (e.g. 5000 = ₹50)
  const MIN_WITHDRAWAL_PAISA = 5000n;
  const pendingEarnings = summary?.pendingEarnings ?? 0n;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerUserId) {
      toast.error("Session expired. Please login again.");
      return;
    }
    const amtRupees = Number.parseFloat(amount);
    if (Number.isNaN(amtRupees) || amtRupees <= 0) {
      toast.error("Valid amount daalo");
      return;
    }
    const amtPaisa = BigInt(Math.round(amtRupees * 100));
    if (amtPaisa < MIN_WITHDRAWAL_PAISA) {
      toast.error(
        `Minimum withdrawal ₹${Number(MIN_WITHDRAWAL_PAISA) / 100} hai`,
      );
      return;
    }
    if (amtPaisa > pendingEarnings) {
      toast.error("Itna balance nahi hai");
      return;
    }
    if (!upiId.trim()) {
      toast.error("UPI ID daalo");
      return;
    }

    withdrawalMutation.mutate(
      { offerUserId, upiId: upiId.trim(), amount: amtPaisa },
      {
        onSuccess: () => {
          toast.success(
            "Withdrawal request submit ho gaya! Admin 24-48h mein process karega. 🎉",
          );
          onBack();
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Request fail hua. Dobara try karein.",
          );
        },
      },
    );
  };

  const minWithdrawalRupees = Number(MIN_WITHDRAWAL_PAISA) / 100;
  const pendingRupees = Number(pendingEarnings) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="flex-1 px-4 py-8 max-w-md mx-auto w-full"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Dashboard
      </button>

      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Gift size={24} className="text-emerald-900" />
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground">
          Earnings Redeem Karein
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Available:{" "}
          <strong className="text-emerald-600">
            ₹{pendingRupees.toFixed(2)}
          </strong>
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
        <span className="text-lg mt-0.5" aria-hidden>
          ℹ️
        </span>
        <p className="text-amber-800 text-xs leading-relaxed">
          Minimum withdrawal: <strong>₹{minWithdrawalRupees}</strong>. Request
          ke 24-48 ghante mein Admin UPI se bhej dega.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="wd-amount"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Amount (₹) *
          </label>
          <input
            id="wd-amount"
            data-ocid="offer_portal.input"
            type="number"
            inputMode="decimal"
            min={minWithdrawalRupees}
            max={pendingRupees}
            step="1"
            placeholder={`Min ₹${minWithdrawalRupees}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            required
          />
        </div>
        <div>
          <label
            htmlFor="wd-upi"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            UPI ID *
          </label>
          <input
            id="wd-upi"
            data-ocid="offer_portal.input"
            type="text"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            required
          />
        </div>
        <button
          type="submit"
          data-ocid="offer_portal.submit_button"
          disabled={
            withdrawalMutation.isPending ||
            pendingEarnings < MIN_WITHDRAWAL_PAISA
          }
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-60 text-sm shadow-md"
        >
          {withdrawalMutation.isPending
            ? "Submitting..."
            : pendingEarnings < MIN_WITHDRAWAL_PAISA
              ? `Need ₹${minWithdrawalRupees} to Withdraw`
              : "Withdrawal Request Submit Karein →"}
        </button>
      </form>
    </motion.div>
  );
}
