import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  FileText,
  PlusCircle,
  Printer,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  useMyRechargeReceipts,
  useMyTopupRequests,
  useRechargeHistory,
  useRequestTopup,
  useWalletBalance,
} from "../hooks/useQueries";
import { useNavigate } from "../lib/router";

type TabId = "topup" | "history" | "receipts";

function RequestStatusBadge({ status }: { status: string }) {
  if (status === "Approved" || status === "approved")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
        <CheckCircle2 size={11} className="mr-1" />
        Approved
      </Badge>
    );
  if (status === "Rejected" || status === "rejected")
    return (
      <Badge variant="destructive" className="text-xs">
        <XCircle size={11} className="mr-1" />
        Rejected
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
      <Clock size={11} className="mr-1" />
      Pending
    </Badge>
  );
}

function TxStatusBadge({ status }: { status: string }) {
  if (status === "Success" || status === "success")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
        <CheckCircle2 size={11} className="mr-1" />
        Success
      </Badge>
    );
  if (status === "Failed" || status === "failed")
    return (
      <Badge variant="destructive" className="text-xs">
        <XCircle size={11} className="mr-1" />
        Failed
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
      <Clock size={11} className="mr-1" />
      Pending
    </Badge>
  );
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "topup",
    label: "Add Money",
    icon: <PlusCircle size={14} />,
  },
  {
    id: "history",
    label: "Recharges",
    icon: <RefreshCw size={14} />,
  },
  {
    id: "receipts",
    label: "Receipts",
    icon: <FileText size={14} />,
  },
];

export default function WalletTransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>("topup");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data: walletBalance = 0,
    isLoading: balLoading,
    refetch: refetchBal,
  } = useWalletBalance();
  const {
    data: topupRequests = [],
    isLoading: reqLoading,
    refetch: refetchReqs,
  } = useMyTopupRequests();
  const {
    data: rechargeHistory = [],
    isLoading: histLoading,
    refetch: refetchHist,
  } = useRechargeHistory();
  const {
    data: receipts = [],
    isLoading: receiptsLoading,
    refetch: refetchReceipts,
  } = useMyRechargeReceipts();
  const requestTopup = useRequestTopup();

  if (!user) {
    navigate("/login");
    return null;
  }

  const filteredHistory = dateFilter
    ? rechargeHistory.filter((tx) =>
        new Date(tx.createdAt).toISOString().startsWith(dateFilter),
      )
    : rechargeHistory;

  async function handleTopupSubmit() {
    const amt = Number.parseFloat(topupAmount);
    if (!amt || amt <= 0) {
      toast.error("Valid amount daalen");
      return;
    }
    setSubmitting(true);
    try {
      await requestTopup.mutateAsync({ amount: amt, note: topupNote.trim() });
      toast.success(
        `₹${amt} add money ki request bhej di gayi. Admin se approval ka wait karein.`,
        { duration: 5000 },
      );
      setTopupAmount("");
      setTopupNote("");
      setShowTopupModal(false);
      refetchReqs();
    } catch {
      toast.error("Request failed. Dobara try karein.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRefreshAll() {
    refetchBal();
    refetchReqs();
    refetchHist();
    refetchReceipts();
    toast.success("Refresh ho gaya!", { duration: 2000 });
  }

  function printReceipt(referenceId: string) {
    // Opens browser print for the receipt row — simple approach
    const printContent = document.getElementById(`receipt-${referenceId}`);
    if (!printContent) {
      window.print();
      return;
    }
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) {
      window.print();
      return;
    }
    w.document.write(`
      <html><head><title>Receipt ${referenceId}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 13px; }
        .row { display: flex; justify-content: space-between; margin: 6px 0; }
        .label { color: #6b7280; }
        .value { font-weight: 600; }
        .ref { color: #d97706; font-family: monospace; font-size: 15px; font-weight: 700; }
        .divider { border-top: 1px dashed #e5e7eb; margin: 10px 0; }
        h2 { color: #059669; margin-bottom: 4px; }
        footer { color: #9ca3af; font-size: 11px; margin-top: 16px; text-align: center; }
      </style></head>
      <body>${printContent.innerHTML}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 300);
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-emerald-600 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet size={22} className="text-white" />
            <div>
              <h1 className="text-white font-bold text-xl">Wallet</h1>
              <p className="text-white/70 text-xs">
                Transactions &amp; Balance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Refresh"
            data-ocid="wallet.refresh_button"
          >
            <RefreshCw size={16} className="text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4 max-w-lg mx-auto">
        {/* Balance Hero Card */}
        <Card className="border-emerald-200 shadow-lg bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <CardContent className="py-6">
            <p className="text-white/80 text-sm font-medium mb-1">
              Live Wallet Balance
            </p>
            {balLoading ? (
              <Skeleton className="h-10 w-32 bg-white/20 rounded-lg" />
            ) : (
              <p
                className="text-4xl font-bold tracking-tight"
                data-ocid="wallet.balance_display"
              >
                ₹{walletBalance.toFixed(2)}
              </p>
            )}
            <p className="text-white/60 text-xs mt-2">
              Har recharge par instant commission milta hai
            </p>
          </CardContent>
        </Card>

        {/* Add Money Button */}
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 text-base"
          onClick={() => setShowTopupModal(true)}
          data-ocid="wallet.add_money_button"
        >
          <PlusCircle size={18} className="mr-2" />
          Add Money
        </Button>

        {/* Tab bar */}
        <div className="flex bg-muted rounded-xl p-1 gap-1" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-ocid={`wallet.tab_${tab.id}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab: Add Money Requests */}
        {activeTab === "topup" && (
          <Card role="tabpanel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add Money Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {reqLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : topupRequests.length === 0 ? (
                <div
                  className="flex flex-col items-center py-8 text-muted-foreground gap-2"
                  data-ocid="wallet.topup_empty_state"
                >
                  <Wallet size={32} className="opacity-30" />
                  <p className="text-sm">Koi request nahi hai abhi</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {topupRequests.map((req) => (
                    <div
                      key={req.id}
                      className="px-4 py-3 flex items-start justify-between gap-2"
                      data-ocid="wallet.topup_row"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-emerald-700">
                            ₹{req.amount}
                          </span>
                          <RequestStatusBadge status={req.status} />
                        </div>
                        {req.note && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {req.note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(req.requestedAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab: Recharge History */}
        {activeTab === "history" && (
          <Card role="tabpanel">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">Recharge History</CardTitle>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-auto text-xs h-8"
                  aria-label="Date filter"
                  data-ocid="wallet.date_filter"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {histLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredHistory.length === 0 ? (
                <div
                  className="flex flex-col items-center py-8 text-muted-foreground gap-2"
                  data-ocid="wallet.recharge_empty_state"
                >
                  <RefreshCw size={32} className="opacity-30" />
                  <p className="text-sm">
                    {dateFilter
                      ? "Is date par koi transaction nahi"
                      : "Koi recharge nahi hua abhi"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="px-4 py-3 flex items-start justify-between gap-2"
                      data-ocid="wallet.recharge_row"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {tx.mobile}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tx.operator}
                          </span>
                          <TxStatusBadge status={tx.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-bold text-base">
                            ₹{tx.amount}
                          </span>
                          {tx.commission > 0 && (
                            <span className="text-xs font-semibold text-emerald-600">
                              +₹{tx.commission.toFixed(2)} earned
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(tx.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab: Receipts */}
        {activeTab === "receipts" && (
          <Card role="tabpanel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">My Receipts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {receiptsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : receipts.length === 0 ? (
                <div
                  className="flex flex-col items-center py-10 text-muted-foreground gap-2"
                  data-ocid="wallet.receipts_empty_state"
                >
                  <FileText size={36} className="opacity-30" />
                  <p className="text-sm">Koi receipt nahi hai abhi</p>
                  <p className="text-xs text-center max-w-[200px]">
                    Successful recharge ke baad receipt yahan dikhegi
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {receipts.map((rc) => {
                    const dateStr = new Date(rc.generatedAt).toLocaleString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    );
                    return (
                      <div
                        key={rc.id}
                        className="px-4 py-3 flex items-start justify-between gap-2"
                        data-ocid="wallet.receipt_row"
                      >
                        {/* Hidden printable content */}
                        <div
                          id={`receipt-${rc.referenceId}`}
                          className="hidden"
                          aria-hidden="true"
                        >
                          <h2>Digital Recharge Receipt</h2>
                          <div className="row">
                            <span className="label">Reference ID:</span>
                            <span className="ref">{rc.referenceId}</span>
                          </div>
                          <div className="divider" />
                          <div className="row">
                            <span className="label">Mobile:</span>
                            <span className="value">{rc.mobile}</span>
                          </div>
                          <div className="row">
                            <span className="label">Operator:</span>
                            <span className="value">{rc.operator}</span>
                          </div>
                          <div className="row">
                            <span className="label">Circle:</span>
                            <span className="value">{rc.circle}</span>
                          </div>
                          <div className="divider" />
                          <div className="row">
                            <span className="label">Amount Paid:</span>
                            <span className="value">
                              ₹{rc.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="row">
                            <span className="label">Net Cost:</span>
                            <span className="value">
                              ₹{rc.netCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="row">
                            <span className="label">Commission:</span>
                            <span className="value">
                              +₹{rc.commission.toFixed(2)}
                            </span>
                          </div>
                          <div className="row">
                            <span className="label">Date:</span>
                            <span className="value">{dateStr}</span>
                          </div>
                          <footer>
                            Digital Zindagi — Your Digital Companion
                          </footer>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-amber-600">
                              {rc.referenceId}
                            </span>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                              <CheckCircle2 size={10} className="mr-1" />
                              Success
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="font-bold text-base text-foreground">
                              ₹{rc.amount.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {rc.mobile} · {rc.operator}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {dateStr}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => printReceipt(rc.referenceId)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors flex-shrink-0 mt-0.5"
                          aria-label={`Receipt print karein — ${rc.referenceId}`}
                          data-ocid="wallet.receipt_print_button"
                          title="Print Receipt"
                        >
                          <Printer size={15} className="text-emerald-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Money Modal */}
      {showTopupModal && (
        <div
          role="presentation"
          aria-label="Add Money"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTopupModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowTopupModal(false);
          }}
        >
          <div className="bg-background rounded-t-2xl w-full max-w-lg shadow-2xl p-5 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">Add Money</h2>
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Band karein"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="topup-amount" className="text-sm font-medium">
                  Amount (₹)
                </Label>
                <Input
                  id="topup-amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 500"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="mt-1"
                  min={1}
                  data-ocid="wallet.topup_amount_input"
                />
              </div>
              <div>
                <Label htmlFor="topup-note" className="text-sm font-medium">
                  Note (Optional)
                </Label>
                <Textarea
                  id="topup-note"
                  placeholder="e.g. UPI transfer kar diya"
                  value={topupNote}
                  onChange={(e) => setTopupNote(e.target.value)}
                  className="mt-1 resize-none"
                  rows={2}
                  data-ocid="wallet.topup_note_input"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                💡 Request bhejne ke baad Admin se UPI/payment details lein aur
                payment karein. Admin approve karne par balance automatically
                add ho jaayega.
              </p>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4"
                disabled={
                  submitting ||
                  !topupAmount ||
                  Number.parseFloat(topupAmount) <= 0
                }
                onClick={handleTopupSubmit}
                data-ocid="wallet.topup_submit_button"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    Bhej raha hai...
                  </span>
                ) : (
                  "Request Bhejein"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
