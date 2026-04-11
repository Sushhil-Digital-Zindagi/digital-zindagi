import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Printer,
  RefreshCw,
  Share2,
  Smartphone,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  useGetRechargeReceipt,
  useInitiateRecharge,
  useMyRechargeReceipts,
  useRechargeHistory,
  useRechargeServiceEnabled,
  useWalletBalance,
} from "../hooks/useQueries";
import { useNavigate } from "../lib/router";
import type { RechargeReceipt, RechargeTransaction } from "../types/appTypes";

const OPERATORS = ["Jio", "Airtel", "VI", "BSNL"];

const CIRCLES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Kolkata",
  "Madhya Pradesh",
  "Maharashtra",
  "Mumbai",
  "North East",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "UP East",
  "UP West",
  "Uttarakhand",
  "West Bengal",
];

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

function StatusBadge({ status }: { status: string }) {
  if (status === "Success" || status === "success")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
        <CheckCircle2 size={12} className="mr-1" />
        Success
      </Badge>
    );
  if (status === "Failed" || status === "failed")
    return (
      <Badge variant="destructive">
        <XCircle size={12} className="mr-1" />
        Failed
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
      <Clock size={12} className="mr-1" />
      Pending
    </Badge>
  );
}

// ---- Receipt Modal ----

interface ReceiptModalProps {
  receipt: RechargeReceipt;
  onClose: () => void;
}

function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  const dateStr = new Date(receipt.generatedAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {/* Print styles injected inline so they work without a separate CSS file */}
      <style>{`
        @media print {
          body > *:not(#dz-receipt-print-root) { display: none !important; }
          #dz-receipt-print-root { display: block !important; }
          .dz-receipt-overlay { background: white !important; position: static !important; padding: 0 !important; }
          .dz-receipt-backdrop { display: none !important; }
          .dz-receipt-actions { display: none !important; }
          .dz-receipt-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; max-width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
        }
      `}</style>

      <dialog
        id="dz-receipt-print-root"
        open
        aria-label="Digital Recharge Receipt"
        className="dz-receipt-overlay fixed inset-0 z-50 flex items-center justify-center bg-transparent border-0 w-full h-full max-w-none max-h-none m-0 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        {/* Dark overlay */}
        <div
          className="dz-receipt-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* Receipt Card */}
        <div className="dz-receipt-card relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="dz-receipt-actions absolute top-3 right-3 p-1.5 rounded-full bg-black/5 hover:bg-black/10 transition-colors z-10"
            aria-label="Close receipt"
          >
            <X size={16} className="text-gray-600" />
          </button>

          {/* Header — emerald gradient */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 pt-8 pb-6 text-center text-white">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={30} className="text-white" />
            </div>
            <h2 className="text-lg font-bold tracking-wide">
              Digital Recharge Receipt
            </h2>
            <p className="text-white/80 text-xs mt-1">Recharge Successful ✓</p>
          </div>

          {/* Reference ID — gold accent */}
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 text-center">
            <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">
              Reference ID
            </p>
            <p className="text-base font-bold text-amber-600 mt-0.5 font-mono tracking-widest">
              {receipt.referenceId}
            </p>
          </div>

          {/* Receipt details */}
          <div className="px-6 py-4 space-y-3">
            {[
              { label: "Mobile Number", value: receipt.mobile },
              { label: "Operator", value: receipt.operator },
              { label: "Circle", value: receipt.circle },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-semibold text-gray-800">
                  {value}
                </span>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-200 my-1" />

            {/* Amount Paid */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Amount Paid</span>
              <span className="text-base font-bold text-emerald-600">
                ₹{receipt.amount.toFixed(2)}
              </span>
            </div>

            {/* Net Cost */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Net Cost (Deducted)</span>
              <span className="text-sm font-semibold text-red-500">
                ₹{receipt.netCost.toFixed(2)}
              </span>
            </div>

            {/* Commission */}
            {receipt.commission > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Commission Earned</span>
                <span className="text-sm font-bold text-emerald-600">
                  +₹{receipt.commission.toFixed(2)}
                </span>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Date & Time</span>
              <span className="text-xs text-gray-700">{dateStr}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Digital Zindagi — Your Digital Companion
            </p>
          </div>

          {/* Action buttons */}
          <div className="dz-receipt-actions px-6 pb-5 pt-3 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold"
              onClick={() => window.print()}
              data-ocid="receipt.print_button"
            >
              <Printer size={14} className="mr-1.5" />
              Print
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
              onClick={onClose}
              data-ocid="receipt.close_button"
            >
              Close
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

// ---- Receipt loader — fetches by txnId ----
function ReceiptLoader({
  txnId,
  onClose,
  fallback,
}: {
  txnId: number;
  onClose: () => void;
  fallback: RechargeReceipt | null;
}) {
  const { data: receipt, isLoading } = useGetRechargeReceipt(txnId);
  const resolved = receipt ?? fallback;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-2xl">
          <RefreshCw size={28} className="text-emerald-600 animate-spin" />
          <p className="text-sm text-gray-600">Receipt lod ho raha hai...</p>
        </div>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-xs w-full">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Receipt Nahi Mili</p>
          <p className="text-sm text-gray-500 mt-1">
            Yeh receipt abhi available nahi hai.
          </p>
          <Button
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onClose}
          >
            Band Karein
          </Button>
        </div>
      </div>
    );
  }

  return <ReceiptModal receipt={resolved} onClose={onClose} />;
}

// ---- Main page ----

export default function MobileRechargePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [operator, setOperator] = useState("");
  const [circle, setCircle] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Receipt modal state
  const [receiptTxnId, setReceiptTxnId] = useState<number | null>(null);
  const [receiptFallback, setReceiptFallback] =
    useState<RechargeReceipt | null>(null);

  const { data: walletBalance = 0, isLoading: balLoading } = useWalletBalance();
  const { data: serviceEnabled = true, isLoading: svcLoading } =
    useRechargeServiceEnabled();
  const {
    data: history = [],
    isLoading: histLoading,
    refetch,
  } = useRechargeHistory();
  // Prefetch receipts so we can match txn.id → receipt for "View Receipt"
  const { data: allReceipts = [] } = useMyRechargeReceipts();
  const initiateRecharge = useInitiateRecharge();

  if (!user) {
    navigate("/login");
    return null;
  }

  const mobileValid = /^\d{10,11}$/.test(mobile);
  const amountNum = Number.parseFloat(amount);
  const canRecharge =
    serviceEnabled &&
    mobileValid &&
    !!operator &&
    !!circle &&
    amountNum > 0 &&
    amountNum <= walletBalance &&
    !loading;

  async function handleRecharge() {
    if (!canRecharge) return;
    setLoading(true);
    try {
      const newTxnId = await initiateRecharge.mutateAsync({
        mobile,
        operator,
        circle,
        amount: amountNum,
      });
      toast.success(`✅ ₹${amountNum} recharge request bheja gaya!`, {
        duration: 5000,
      });
      setMobile("");
      setAmount("");
      setOperator("");
      setCircle("");
      refetch();
      // Auto-show receipt modal for the new transaction
      if (typeof newTxnId === "number" && newTxnId > 0) {
        setReceiptTxnId(newTxnId);
        setReceiptFallback(null);
      }
    } catch {
      toast.error("Recharge failed. Dobara try karein.");
    } finally {
      setLoading(false);
    }
  }

  function openReceiptForTx(tx: RechargeTransaction) {
    // Try to find a pre-loaded receipt matching this transaction
    const existing = allReceipts.find((r) => r.txnId === tx.id);
    setReceiptFallback(existing ?? null);
    setReceiptTxnId(tx.id);
  }

  function shareOnWhatsApp(tx: {
    mobile: string;
    operator: string;
    amount: number;
    status: string;
    commission: number;
  }) {
    const msg = `📱 *Recharge Successful!*\nMobile: ${tx.mobile}\nOperator: ${tx.operator}\nAmount: ₹${tx.amount}\nStatus: ${tx.status}\nCommission: ₹${tx.commission.toFixed(2)}\n\n_via *Digital Zindagi* App_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-emerald-600 px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <Smartphone size={22} className="text-white" />
          <h1 className="text-white font-bold text-xl">Mobile Recharge</h1>
        </div>
        <p className="text-white/70 text-sm">
          Fast &amp; Secure Recharge with Instant Commission
        </p>
      </div>

      <div className="px-4 -mt-3 space-y-4 max-w-lg mx-auto">
        {/* Wallet Balance Card */}
        <Card className="border-emerald-200 shadow-md bg-gradient-to-r from-emerald-50 to-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Wallet size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Wallet Balance
                  </p>
                  {balLoading ? (
                    <Skeleton className="h-6 w-20 mt-0.5" />
                  ) : (
                    <p className="text-2xl font-bold text-emerald-600">
                      ₹{walletBalance.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
                onClick={() => navigate("/wallet-transactions")}
                data-ocid="recharge.add_money_button"
              >
                + Add Money
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Service Off Banner */}
        {!svcLoading && !serviceEnabled && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700 text-sm">
                Recharge Service Unavailable
              </p>
              <p className="text-red-600 text-xs">
                Yeh service abhi band hai. Admin se contact karein.
              </p>
            </div>
          </div>
        )}

        {/* Recharge Form */}
        {(svcLoading || serviceEnabled) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recharge Karein</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile Number */}
              <div>
                <Label htmlFor="mobile" className="text-sm font-medium">
                  Mobile Number
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  maxLength={11}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  className={`mt-1 ${mobile && !mobileValid ? "border-red-400" : ""}`}
                  data-ocid="recharge.mobile_input"
                />
                {mobile && !mobileValid && (
                  <p className="text-xs text-red-500 mt-1">
                    10 ya 11 digit ka mobile number daalen
                  </p>
                )}
              </div>

              {/* Operator */}
              <div>
                <Label htmlFor="operator" className="text-sm font-medium">
                  Operator
                </Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {OPERATORS.map((op) => (
                    <button
                      key={op}
                      type="button"
                      data-ocid={`recharge.operator_${op.toLowerCase()}`}
                      onClick={() => setOperator(op)}
                      className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                        operator === op
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-muted text-foreground border-border hover:border-emerald-400"
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Circle */}
              <div>
                <Label htmlFor="circle" className="text-sm font-medium">
                  Circle (State)
                </Label>
                <select
                  id="circle"
                  value={circle}
                  onChange={(e) => setCircle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-ocid="recharge.circle_select"
                >
                  <option value="">-- Circle chunein --</option>
                  {CIRCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <Label className="text-sm font-medium">Amount (₹)</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {QUICK_AMOUNTS.map((qa) => (
                    <button
                      key={qa}
                      type="button"
                      data-ocid={`recharge.quick_amount_${qa}`}
                      onClick={() => setAmount(String(qa))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                        amount === String(qa)
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-muted text-foreground border-border hover:border-emerald-400"
                      }`}
                    >
                      ₹{qa}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Ya custom amount daalen"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  data-ocid="recharge.amount_input"
                />
                {amountNum > 0 && amountNum > walletBalance && (
                  <p className="text-xs text-red-500 mt-1">
                    Insufficient balance.{" "}
                    <button
                      type="button"
                      className="underline text-emerald-600"
                      onClick={() => navigate("/wallet-transactions")}
                    >
                      Add Money
                    </button>
                  </p>
                )}
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base py-5"
                disabled={!canRecharge}
                onClick={handleRecharge}
                data-ocid="recharge.submit_button"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin" />{" "}
                    Processing...
                  </span>
                ) : (
                  `Recharge Karein — ₹${amountNum > 0 ? amountNum : "0"}`
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transaction History</CardTitle>
              <button
                type="button"
                onClick={() => refetch()}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Refresh"
                data-ocid="recharge.refresh_button"
              >
                <RefreshCw size={15} className="text-muted-foreground" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {histLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div
                className="flex flex-col items-center py-10 text-muted-foreground gap-2"
                data-ocid="recharge.empty_state"
              >
                <Smartphone size={36} className="opacity-30" />
                <p className="text-sm">Abhi koi transaction nahi hai</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((tx) => (
                  <div
                    key={tx.id}
                    className="px-4 py-3 flex items-start justify-between gap-2"
                    data-ocid="recharge.history_row"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">
                          {tx.mobile}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tx.operator}
                        </span>
                        <StatusBadge status={tx.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-base font-bold text-foreground">
                          ₹{tx.amount}
                        </span>
                        {tx.commission > 0 && (
                          <span className="text-xs font-semibold text-emerald-600">
                            +₹{tx.commission.toFixed(2)} commission
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(tx.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      {/* View Receipt — only for successful recharges */}
                      {(tx.status === "Success" || tx.status === "success") && (
                        <button
                          type="button"
                          onClick={() => openReceiptForTx(tx)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                          aria-label="Receipt dekhen"
                          data-ocid="recharge.view_receipt_button"
                          title="Receipt dekhen"
                        >
                          <FileText size={15} className="text-emerald-600" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => shareOnWhatsApp(tx)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                        aria-label="WhatsApp par share karein"
                        data-ocid="recharge.share_button"
                      >
                        <Share2 size={15} className="text-emerald-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Modal */}
      {receiptTxnId !== null && (
        <ReceiptLoader
          txnId={receiptTxnId}
          onClose={() => {
            setReceiptTxnId(null);
            setReceiptFallback(null);
          }}
          fallback={receiptFallback}
        />
      )}
    </div>
  );
}
