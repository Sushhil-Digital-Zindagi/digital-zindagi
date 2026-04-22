/**
 * PayToUnlockModal — Pay to unlock a monetized chat message.
 * Supports Stripe (redirect to checkout) and UPI (QR + txn ref).
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  CreditCard,
  IndianRupee,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useConfirmUpiUnlock,
  useCreateUnlockPaymentIntent,
} from "../../hooks/useChatQueries";
import type { ChatMessage } from "../../types/chatTypes";

interface Props {
  message: ChatMessage;
  onClose: () => void;
  onUnlocked?: () => void;
}

type PayMethod = "stripe" | "upi";

export default function PayToUnlockModal({
  message,
  onClose,
  onUnlocked,
}: Props) {
  const [method, setMethod] = useState<PayMethod>("upi");
  const [txnRef, setTxnRef] = useState("");
  const [upiId, setUpiId] = useState<string | null>(null);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);
  const [upiStep, setUpiStep] = useState<
    "idle" | "scan" | "confirming" | "done"
  >("idle");

  const createIntent = useCreateUnlockPaymentIntent();
  const confirmUpi = useConfirmUpiUnlock();

  const price = message.unlockPrice ?? 0;
  const preview =
    message.content.slice(0, 60) + (message.content.length > 60 ? "..." : "");

  async function handleStripe() {
    try {
      const result = (await createIntent.mutateAsync({
        messageId: message.id,
        conversationId: message.conversationId,
        method: "stripe",
      })) as { checkoutUrl?: string; error?: string };

      if (result?.checkoutUrl) {
        setStripeUrl(result.checkoutUrl);
        window.open(result.checkoutUrl, "_blank");
      } else {
        toast.error(result?.error ?? "Stripe checkout नहीं खुला।");
      }
    } catch {
      toast.error("Payment नहीं बनी। दोबारा try करें।");
    }
  }

  async function handleUpiInit() {
    try {
      const result = (await createIntent.mutateAsync({
        messageId: message.id,
        conversationId: message.conversationId,
        method: "upi",
      })) as { upiId?: string; error?: string };

      if (result?.upiId) {
        setUpiId(result.upiId);
        setUpiStep("scan");
      } else {
        toast.error(result?.error ?? "UPI ID नहीं मिली।");
      }
    } catch {
      toast.error("UPI setup नहीं हुई।");
    }
  }

  async function handleConfirmUpi() {
    if (!txnRef.trim()) return;
    setUpiStep("confirming");
    try {
      const result = (await confirmUpi.mutateAsync({
        messageId: message.id,
        conversationId: message.conversationId,
        txnRef: txnRef.trim(),
      })) as { success?: boolean; pending?: boolean };

      if (result?.success) {
        setUpiStep("done");
        toast.success("Payment verified! Content unlock हो गया 🎉");
        onUnlocked?.();
        setTimeout(onClose, 1800);
      } else if (result?.pending) {
        toast.info("Admin verification pending। जल्द unlock होगा।");
        onClose();
      } else {
        setUpiStep("scan");
        toast.error("Transaction verify नहीं हुई। Txn ID check करें।");
      }
    } catch {
      setUpiStep("scan");
      toast.error("Confirm नहीं हुआ। दोबारा try करें।");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="chat.pay_to_unlock_modal"
    >
      <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock size={16} className="text-primary" />
            </div>
            <h2 className="font-bold text-foreground text-sm">
              Content Unlock
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
            data-ocid="chat.pay_to_unlock_modal.close_button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Blurred preview */}
          <div className="bg-muted/40 border border-border rounded-xl p-3 relative overflow-hidden">
            <p className="text-sm text-foreground/30 blur-[4px] select-none line-clamp-2">
              {preview}
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-card/90 border border-border rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <Lock size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  Locked Content
                </span>
              </div>
            </div>
          </div>

          {/* Price badge */}
          <div className="flex items-center justify-center gap-2 py-2 bg-primary/5 rounded-xl border border-primary/15">
            <IndianRupee size={16} className="text-primary" />
            <span className="text-xl font-bold text-primary">₹{price}</span>
            <span className="text-sm text-muted-foreground">
              unlock करने के लिए
            </span>
          </div>

          {/* Success state */}
          {upiStep === "done" && (
            <div
              className="flex flex-col items-center gap-2 py-4 animate-in fade-in duration-300"
              data-ocid="chat.pay_to_unlock_success_state"
            >
              <CheckCircle size={36} className="text-emerald-600" />
              <p className="text-sm font-semibold text-foreground">
                Unlocked! 🎉
              </p>
            </div>
          )}

          {upiStep !== "done" && (
            <>
              {/* Payment method tabs */}
              <div className="grid grid-cols-2 gap-2">
                {(["upi", "stripe"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    data-ocid={`chat.pay_method_${m}`}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      method === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {m === "upi" ? (
                      "📱 UPI"
                    ) : (
                      <>
                        <CreditCard size={13} /> Card
                      </>
                    )}
                  </button>
                ))}
              </div>

              {/* Stripe flow */}
              {method === "stripe" && (
                <div className="space-y-3">
                  {stripeUrl ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground text-center">
                        Payment tab खुल गया है।
                      </p>
                      <a
                        href={stripeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center text-xs text-primary underline underline-offset-2"
                        data-ocid="chat.stripe_checkout_link"
                      >
                        फिर से खोलें →
                      </a>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={handleStripe}
                      disabled={createIntent.isPending}
                      data-ocid="chat.stripe_pay_button"
                    >
                      {createIntent.isPending ? (
                        <Loader2 size={14} className="animate-spin mr-2" />
                      ) : (
                        <CreditCard size={14} className="mr-2" />
                      )}
                      Pay ₹{price} with Card
                    </Button>
                  )}
                </div>
              )}

              {/* UPI flow */}
              {method === "upi" && (
                <div className="space-y-3">
                  {upiStep === "idle" && (
                    <Button
                      className="w-full"
                      onClick={handleUpiInit}
                      disabled={createIntent.isPending}
                      data-ocid="chat.upi_init_button"
                    >
                      {createIntent.isPending ? (
                        <Loader2 size={14} className="animate-spin mr-2" />
                      ) : (
                        <span className="mr-2">📱</span>
                      )}
                      Pay with UPI
                    </Button>
                  )}

                  {upiStep === "scan" && upiId && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {/* UPI ID to copy */}
                      <div className="bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground mb-0.5">
                          UPI ID पर ₹{price} भेजें
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {upiId}
                        </p>
                      </div>

                      {/* Txn reference */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Transaction ID / UTR
                        </Label>
                        <Input
                          placeholder="UTR या txn reference ID"
                          value={txnRef}
                          onChange={(e) => setTxnRef(e.target.value)}
                          className="text-sm"
                          data-ocid="chat.upi_txn_ref_input"
                        />
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleConfirmUpi}
                        disabled={!txnRef.trim() || confirmUpi.isPending}
                        data-ocid="chat.upi_confirm_button"
                      >
                        {confirmUpi.isPending ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={13} className="animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          "Payment Confirm करें"
                        )}
                      </Button>
                    </div>
                  )}

                  {upiStep === "confirming" && (
                    <div
                      className="flex flex-col items-center gap-2 py-4"
                      data-ocid="chat.pay_to_unlock_loading_state"
                    >
                      <Loader2
                        size={24}
                        className="animate-spin text-primary"
                      />
                      <p className="text-xs text-muted-foreground">
                        Payment verify हो रही है...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Cancel */}
          {upiStep !== "done" && (
            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              data-ocid="chat.pay_to_unlock_modal.cancel_button"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
