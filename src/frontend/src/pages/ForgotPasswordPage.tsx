import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { hashPassword } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { Link, useNavigate } from "../lib/router";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"mobile" | "question" | "reset">("mobile");
  const [mobile, setMobile] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const { actor } = useActor();
  const navigate = useNavigate();

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim() || !actor) return;
    setLoading(true);
    try {
      const user = await actor.getUserByMobile(mobile.trim());
      if (!user) {
        toast.error("Yeh mobile number registered nahi hai");
        return;
      }
      setQuestion(user.securityQuestion);
      setStep("question");
    } catch (err: any) {
      toast.error(err?.message ?? "Kuch problem ho gayi");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPwd || newPwd !== confirmPwd) {
      toast.error("Passwords match nahi kar rahe");
      return;
    }
    if (!actor) return;
    setLoading(true);
    try {
      const hash = await hashPassword(newPwd);
      await actor.forgotPassword(mobile, answer, hash);
      toast.success("Password reset ho gaya! Ab login karein.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.message ?? "Answer galat hai ya koi aur problem hai");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-emerald-header px-8 py-8">
          <Link
            to="/login"
            className="text-white/70 text-sm hover:text-white mb-3 block"
          >
            &larr; Login pe wapas jao
          </Link>
          <h1 className="font-heading font-bold text-white text-2xl">
            Password Bhool Gaye?
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Koi baat nahi, hum help karenge
          </p>
        </div>

        <div className="px-8 py-8">
          {step === "mobile" && (
            <form onSubmit={handleMobileSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="f-mobile"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Mobile Number
                </label>
                <input
                  id="f-mobile"
                  data-ocid="forgot.input"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Registered mobile number"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                data-ocid="forgot.submit_button"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Aage Badho
              </button>
            </form>
          )}

          {step === "question" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep("reset");
              }}
              className="space-y-4"
            >
              <div className="bg-accent rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Security Question:
                </p>
                <p className="font-semibold text-foreground">{question}</p>
              </div>
              <div>
                <label
                  htmlFor="f-answer"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Apna Jawab Dein
                </label>
                <input
                  id="f-answer"
                  data-ocid="forgot.input"
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Security question ka jawab"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                data-ocid="forgot.submit_button"
                disabled={!answer.trim()}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
              >
                Verify Karein
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label
                  htmlFor="f-newpwd"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Naya Password
                </label>
                <input
                  id="f-newpwd"
                  data-ocid="forgot.input"
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Naya password daalein"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="f-confirmpwd"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="f-confirmpwd"
                  data-ocid="forgot.input"
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Password dobara daalein"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                data-ocid="forgot.submit_button"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Password Reset Karein
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
