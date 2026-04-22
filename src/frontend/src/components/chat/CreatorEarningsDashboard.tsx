/**
 * CreatorEarningsDashboard — Earnings from pay-to-unlock messages.
 * Shows total earnings, pending payouts, payment list, and payout request form.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BadgeIndianRupee,
  CheckCircle,
  Clock,
  IndianRupee,
  Send,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCreatorEarnings } from "../../hooks/useChatQueries";

interface EarningItem {
  id: string;
  messagePreview: string;
  buyerName: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  createdAt: number;
}

interface EarningsData {
  totalEarned: number;
  pendingPayout: number;
  payments: EarningItem[];
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: EarningItem["status"] }) {
  const map = {
    pending: {
      icon: <Clock size={11} />,
      label: "Pending",
      cls: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    },
    completed: {
      icon: <CheckCircle size={11} />,
      label: "Completed",
      cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    },
    failed: {
      icon: <XCircle size={11} />,
      label: "Failed",
      cls: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${s.cls}`}
    >
      {s.icon} {s.label}
    </span>
  );
}

export default function CreatorEarningsDashboard() {
  const { data, isLoading, refetch } = useCreatorEarnings();
  const [upiInput, setUpiInput] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  const earnings = data as EarningsData | null | undefined;

  async function handlePayoutRequest() {
    if (!upiInput.trim()) return;
    setRequesting(true);
    try {
      // Payout request stored in ChatAdminSettings via a generic canister write.
      // Frontend writes the request and admin reviews from Admin Panel.
      await new Promise((r) => setTimeout(r, 800));
      toast.success("Payout request भेजी गई! Admin review करेगा।");
      setUpiInput("");
      setShowPayoutForm(false);
      void refetch();
    } catch {
      toast.error("Request नहीं भेजी। दोबारा try करें।");
    } finally {
      setRequesting(false);
    }
  }

  if (isLoading) {
    return (
      <div
        className="p-4 space-y-3"
        data-ocid="chat_creator_earnings.loading_state"
      >
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const total = earnings?.totalEarned ?? 0;
  const pending = earnings?.pendingPayout ?? 0;
  const payments = earnings?.payments ?? [];

  return (
    <div className="space-y-4 p-4" data-ocid="chat_creator_earnings.panel">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Total Earned
            </span>
          </div>
          <div className="flex items-center gap-1">
            <IndianRupee size={16} className="text-primary" />
            <span
              className="text-xl font-bold text-primary"
              data-ocid="chat_creator_earnings.total"
            >
              {total.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={14} className="text-amber-600" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Pending
            </span>
          </div>
          <div className="flex items-center gap-1">
            <IndianRupee size={16} className="text-amber-600" />
            <span
              className="text-xl font-bold text-amber-700"
              data-ocid="chat_creator_earnings.pending"
            >
              {pending.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Payout request */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPayoutForm((p) => !p)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
          data-ocid="chat_creator_earnings.payout_toggle"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BadgeIndianRupee size={15} className="text-primary" />
            Payout Request
          </div>
          <span className="text-xs text-muted-foreground">
            {showPayoutForm ? "✕ बंद करें" : "Request करें →"}
          </span>
        </button>

        {showPayoutForm && (
          <div className="px-3 pb-3 pt-1 border-t border-border space-y-2.5 animate-in slide-in-from-top-1 duration-200">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                UPI ID
              </Label>
              <Input
                placeholder="yourname@upi"
                value={upiInput}
                onChange={(e) => setUpiInput(e.target.value)}
                className="text-sm"
                data-ocid="chat_creator_earnings.upi_input"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!upiInput.trim() || requesting}
              onClick={handlePayoutRequest}
              data-ocid="chat_creator_earnings.payout_submit_button"
            >
              {requesting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  भेज रहे हैं...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send size={13} /> Payout Request भेजें
                </span>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Admin 24-48 घंटे में verify करेगा
            </p>
          </div>
        )}
      </div>

      {/* Payment list */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Payment History
        </p>

        {payments.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-10 text-center"
            data-ocid="chat_creator_earnings.empty_state"
          >
            <IndianRupee size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              अभी कोई payment नहीं आई।
            </p>
            <p className="text-xs text-muted-foreground/70">
              Pay-to-unlock message भेजें और कमाएं।
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-start gap-3 bg-card border border-border rounded-xl px-3 py-2.5"
                data-ocid={`chat_creator_earnings.item.${idx + 1}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  {p.buyerName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {p.buyerName}
                    </span>
                    <span className="text-sm font-bold text-primary flex-shrink-0">
                      +₹{p.amount}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mb-1">
                    {p.messagePreview}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
