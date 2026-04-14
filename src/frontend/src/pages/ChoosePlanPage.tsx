import { CheckCircle, Crown, Tv2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { Link, useNavigate } from "../lib/router";
import { PlanType } from "../types/appTypes";

const PREMIUM_FEATURES = [
  "Full profile listing",
  "Search mein priority dikhein",
  "Koi bhi advertisement nahi",
  "Priority placement",
  "WhatsApp button",
  "Email + Call support",
];

const FREE_FEATURES = [
  "Full profile listing",
  "Search mein dikhein",
  "WhatsApp button",
  "Sabhi pages par ads dikhenge",
];

export default function ChoosePlanPage() {
  const { user } = useAuth();
  const { actor } = useActor();
  const navigate = useNavigate();

  const handlePremium = () => {
    if (!user) return;
    // Save plan choice immediately
    localStorage.setItem("planChoice", "subscription");
    localStorage.setItem(`dz_provider_plantype_${user.userId}`, "premium");
    // Fire-and-forget canister call in background
    if (actor) {
      actor.setPlanType(user.userId, PlanType.premium).catch(() => {
        /* background update — ignore failure */
      });
    }
    // Navigate to subscription/registration page
    navigate("/provider/subscribe");
  };

  const handleFree = () => {
    if (!user) return;
    // Save plan choice
    localStorage.setItem("planChoice", "free");
    localStorage.setItem(`dz_provider_plantype_${user.userId}`, "free");
    // Fire canister call in background (non-blocking)
    if (actor) {
      actor.setPlanType(user.userId, PlanType.free).catch(() => {
        /* background update — ignore failure */
      });
    }
    // Free plan providers go to dashboard (handles first-time setup inline)
    navigate("/provider/dashboard");
  };

  return (
    <div className="min-h-screen bg-emerald-hero flex flex-col">
      {/* Header */}
      <div className="bg-emerald-header text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link
            to="/"
            className="text-white/70 text-sm hover:text-white mb-3 block"
          >
            &larr; Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl text-white">
                Apna Plan Chunein
              </h1>
              <p className="text-white/70 text-sm">
                Choose Your Plan — Digital Zindagi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Dono options mein apni profile listed rahegi. Farq sirf ads aur
          payment ka hai.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Premium Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            data-ocid="choose_plan.item.1"
            className="bg-white rounded-3xl border-2 border-primary shadow-card-hover overflow-hidden"
          >
            {/* Badge */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Crown size={18} className="text-yellow-300" />
                <span className="font-heading font-bold text-lg">
                  Premium Plan
                </span>
              </div>
              <p className="text-emerald-100 text-sm">
                Subscription fee do, ads bilkul nahi
              </p>
            </div>

            <div className="p-5 space-y-4">
              <ul className="space-y-2.5">
                {PREMIUM_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <CheckCircle
                      size={15}
                      className="text-emerald-500 flex-shrink-0"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-700 font-medium">
                  💰 Ek baar pay karo, zero ads
                </p>
              </div>

              <button
                type="button"
                data-ocid="choose_plan.primary_button"
                onClick={handlePremium}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Crown size={16} />
                Subscription Lege
              </button>
            </div>
          </motion.div>

          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            data-ocid="choose_plan.item.2"
            className="bg-white rounded-3xl border-2 border-border shadow-card overflow-hidden"
          >
            {/* Badge */}
            <div className="bg-gradient-to-r from-slate-500 to-slate-400 px-6 py-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Tv2 size={18} className="text-slate-200" />
                <span className="font-heading font-bold text-lg">
                  Free Plan
                </span>
              </div>
              <p className="text-slate-200 text-sm">
                Koi payment nahi, lekin ads dikhenge
              </p>
            </div>

            <div className="p-5 space-y-4">
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li
                    key={f}
                    className={`flex items-center gap-2 text-sm ${
                      f.includes("ads") ? "text-orange-600" : "text-foreground"
                    }`}
                  >
                    <CheckCircle
                      size={15}
                      className={`flex-shrink-0 ${
                        f.includes("ads") ? "text-orange-400" : "text-slate-400"
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-700 font-medium">
                  📢 Har page par advertisements dikhenge
                </p>
              </div>

              <button
                type="button"
                data-ocid="choose_plan.secondary_button"
                onClick={handleFree}
                className="w-full bg-slate-100 text-slate-700 border border-slate-200 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Tv2 size={16} />
                Ads Dekhe
              </button>
            </div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Baad mein premium plan lena chahein? Settings se upgrade kar sakte
          hain.
        </p>
      </div>
    </div>
  );
}
