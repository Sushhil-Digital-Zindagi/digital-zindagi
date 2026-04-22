/**
 * PremiumPage — Premium subscription upgrade page for Likeup chat module.
 * Shows current plan status, plan cards, Stripe & UPI payment options.
 */

import {
  CheckCircle,
  ChevronLeft,
  Clock,
  CreditCard,
  Loader2,
  QrCode,
  Smartphone,
  Star,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChatProvider } from "../contexts/ChatContext";
import {
  DEFAULT_PREMIUM_PLANS,
  useIsPremiumUser,
  useMySubscription,
  usePremiumPlans,
  useSubmitUpiPremiumRequest,
} from "../hooks/usePremiumQueries";
import { useNavigate } from "../lib/router";
import type { PremiumPlan, PremiumPlanKey } from "../types/premiumTypes";

// ---- Premium feature list ----
const PREMIUM_PERKS = [
  { icon: "🚫", text: "Watermark-free sharing" },
  { icon: "💾", text: "Unlimited file storage (up to 20MB)" },
  { icon: "👻", text: "Advanced Ghost Mode" },
  { icon: "🤖", text: "Priority AI Chat Summary" },
  { icon: "⏰", text: "Unlimited scheduled messages" },
];

// ---- Helpers ----
function daysLeft(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
}

// ---- Plan Card ----
function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: PremiumPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  const perMonth =
    plan.key === "quarterly"
      ? Math.round(plan.price / 3)
      : plan.key === "annual"
        ? Math.round(plan.price / 12)
        : plan.price;

  return (
    <button
      type="button"
      data-ocid={`premium.plan_card.${plan.key}`}
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all relative ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      {plan.savings && (
        <span className="absolute -top-2.5 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {plan.savings}
        </span>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-foreground text-sm">{plan.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {plan.durationDays} days
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            ₹{plan.price.toLocaleString("en-IN")}
          </p>
          {plan.key !== "monthly" && (
            <p className="text-xs text-muted-foreground">₹{perMonth}/month</p>
          )}
        </div>
      </div>
      {selected && (
        <div className="absolute top-3 left-3">
          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle size={12} className="text-white" />
          </div>
        </div>
      )}
    </button>
  );
}

// ---- UPI Payment Form ----
function UpiPaymentForm({
  plan,
  onSuccess,
}: {
  plan: PremiumPlan;
  onSuccess: () => void;
}) {
  const submitUpi = useSubmitUpiPremiumRequest();
  const [txnRef, setTxnRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Demo UPI ID — admin should configure actual UPI
  const UPI_ID = "digitalzindagi@paytm";

  const handleSubmit = async () => {
    if (!txnRef.trim()) {
      toast.error("Transaction reference daalo.");
      return;
    }
    setSubmitting(true);
    try {
      await submitUpi.mutateAsync({
        planKey: plan.key,
        amount: plan.price,
        upiTransactionRef: txnRef.trim(),
      });
      toast.success("Payment submitted! Admin jald activate karega. ✅");
      onSuccess();
    } catch {
      toast.error("Submit nahi ho saka. Dobara try karein.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4" data-ocid="premium.upi_payment_section">
      {/* QR Code placeholder — qr-code extension */}
      <div className="bg-muted rounded-2xl p-6 flex flex-col items-center gap-3 border border-border">
        <div className="w-40 h-40 bg-card border-2 border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <QrCode size={56} className="text-primary" />
          <p className="text-xs font-medium text-center px-2">
            Scan to Pay ₹{plan.price}
          </p>
        </div>
        <p className="text-sm font-semibold text-foreground">
          UPI ID: <span className="font-bold text-primary">{UPI_ID}</span>
        </p>
        <p className="text-xs text-muted-foreground text-center">
          GPay, PhonePe, Paytm, ya koi bhi UPI app se pay karein
        </p>
      </div>

      {/* Transaction reference input */}
      <div>
        <label
          htmlFor="upi-txn-ref"
          className="block text-xs font-medium text-muted-foreground mb-1.5"
        >
          Transaction Reference / UTR Number *
        </label>
        <input
          id="upi-txn-ref"
          type="text"
          value={txnRef}
          onChange={(e) => setTxnRef(e.target.value)}
          placeholder="e.g. 308512345678"
          data-ocid="premium.upi_txn_input"
          className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Payment ke baad transaction ID ya UTR number daalo
        </p>
      </div>

      <button
        type="button"
        data-ocid="premium.upi_submit_button"
        onClick={handleSubmit}
        disabled={submitting || !txnRef.trim()}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-2xl font-bold text-sm hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98] transition-all"
      >
        {submitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Smartphone size={16} />
        )}
        {submitting ? "Submitting..." : "Submit Payment"}
      </button>
    </div>
  );
}

type PaymentMethod = "stripe" | "upi" | null;

function PremiumPageInner() {
  const navigate = useNavigate();
  const { data: isPremium = false, isLoading: statusLoading } =
    useIsPremiumUser();
  const { data: subscription } = useMySubscription();
  const { data: plans = DEFAULT_PREMIUM_PLANS, isLoading: plansLoading } =
    usePremiumPlans();

  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanKey>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [upiSuccess, setUpiSuccess] = useState(false);

  const activePlan = plans.find((p) => p.key === selectedPlan) ?? plans[0];

  if (statusLoading || plansLoading) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        data-ocid="premium.loading_state"
      >
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-8">
      {/* Header */}
      <header className="bg-emerald-header text-white sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            type="button"
            onClick={() => navigate("/chat/profile")}
            aria-label="Back"
            data-ocid="premium.back_button"
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Star size={18} className="text-yellow-300 fill-yellow-300" />
            <h1 className="font-bold text-base">Premium Upgrade</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 pt-5 space-y-5 max-w-lg mx-auto w-full">
        {/* Current Status */}
        {isPremium && subscription ? (
          <div
            className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white"
            data-ocid="premium.active_status"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Star size={20} className="fill-white" />
              </div>
              <div>
                <p className="font-bold text-lg">Premium Active ✓</p>
                <p className="text-white/80 text-xs">
                  {subscription.planKey
                    ? `${subscription.planKey.charAt(0).toUpperCase()}${subscription.planKey.slice(1)} Plan`
                    : "Premium Plan"}
                </p>
              </div>
            </div>
            {subscription.expiresAt && (
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                <Clock size={14} />
                <span className="text-sm font-medium">
                  {daysLeft(subscription.expiresAt)} din baki hain
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            className="bg-muted/50 border border-border rounded-2xl p-4 flex items-center gap-3"
            data-ocid="premium.free_status"
          >
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Free Plan</p>
              <p className="text-xs text-muted-foreground">
                Upgrade karein aur sab features unlock karein
              </p>
            </div>
          </div>
        )}

        {/* Premium Perks */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <Star size={15} className="text-yellow-500 fill-yellow-500" />
            Premium Features
          </h2>
          <div className="space-y-2.5">
            {PREMIUM_PERKS.map((perk) => (
              <div key={perk.text} className="flex items-center gap-3">
                <span className="text-base flex-shrink-0">{perk.icon}</span>
                <span className="text-sm text-foreground">{perk.text}</span>
                <CheckCircle
                  size={14}
                  className="text-primary ml-auto flex-shrink-0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Plan Selection */}
        {!upiSuccess && (
          <>
            <div>
              <h2 className="font-bold text-foreground text-sm mb-3">
                Plan Choose Karein
              </h2>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.key}
                    plan={plan}
                    selected={selectedPlan === plan.key}
                    onSelect={() => {
                      setSelectedPlan(plan.key);
                      setPaymentMethod(null);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Payment Method Selection */}
            {!paymentMethod && (
              <div className="space-y-3" data-ocid="premium.payment_methods">
                <h2 className="font-bold text-foreground text-sm">
                  Payment Method
                </h2>
                <button
                  type="button"
                  data-ocid="premium.upi_button"
                  onClick={() => setPaymentMethod("upi")}
                  className="w-full flex items-center gap-4 bg-card border-2 border-border rounded-2xl px-5 py-4 hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Smartphone size={20} className="text-primary" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      Pay with UPI
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GPay, PhonePe, Paytm — instant
                    </p>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full flex-shrink-0">
                    Recommended
                  </span>
                </button>

                <button
                  type="button"
                  data-ocid="premium.stripe_button"
                  onClick={() =>
                    toast.info(
                      "Stripe integration admin panel se configure hogi.",
                    )
                  }
                  className="w-full flex items-center gap-4 bg-card border-2 border-border rounded-2xl px-5 py-4 hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                    <CreditCard size={20} className="text-muted-foreground" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      Pay with Card
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Visa, Mastercard via Stripe
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* UPI Payment Flow */}
            {paymentMethod === "upi" && activePlan && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-foreground text-sm">
                    UPI Payment — ₹{activePlan.price}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    data-ocid="premium.back_to_methods_button"
                  >
                    ← Change
                  </button>
                </div>
                <UpiPaymentForm
                  plan={activePlan}
                  onSuccess={() => setUpiSuccess(true)}
                />
              </div>
            )}
          </>
        )}

        {/* UPI Success Screen */}
        {upiSuccess && (
          <div
            className="flex flex-col items-center gap-4 py-8 px-4"
            data-ocid="premium.upi_success_state"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="font-bold text-xl text-foreground mb-2">
                Payment Submitted! 🎉
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aapka payment admin ke paas review ke liye bheej diya gaya hai.
                Approve hone ke baad aapka Premium plan activate ho jaayega.
              </p>
            </div>
            <button
              type="button"
              data-ocid="premium.go_to_chat_button"
              onClick={() => navigate("/chat")}
              className="mt-2 bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Chat Par Jaayein
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <ChatProvider>
      <PremiumPageInner />
    </ChatProvider>
  );
}
