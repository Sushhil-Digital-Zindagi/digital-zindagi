import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  LogIn,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AdMobBanner from "../components/AdMobBanner";
import InterstitialAd from "../components/InterstitialAd";
import { useAuth } from "../contexts/AuthContext";
import {
  useAddUdhaarCustomer,
  useAddUdhaarTransaction,
  useAllUdhaarTransactions,
  useDeleteUdhaarCustomer,
  useDeleteUdhaarTransaction,
  useMarkUdhaarTransactionPaid,
  useProviderProfile,
  useUdhaarCustomers,
  useUdhaarTransactions,
} from "../hooks/useQueries";
import { useNavigate } from "../lib/router";
import type { UdhaarCustomer, UdhaarTransaction } from "../types/appTypes";
import { UserRole } from "../types/appTypes";

// ---- Balance Helpers ----
function getBalance(transactions: UdhaarTransaction[]): number {
  return transactions.reduce((acc, t) => {
    return t.status === "pending"
      ? t.txType === "give"
        ? acc + t.amount
        : acc - t.amount
      : acc;
  }, 0);
}

function BalanceBadge({ balance }: { balance: number }) {
  if (balance > 0)
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-red-100 text-red-700 border border-red-200">
        आपको मिलेगा ₹{balance.toLocaleString("hi-IN")}
      </span>
    );
  if (balance < 0)
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        आप देंगे ₹{Math.abs(balance).toLocaleString("hi-IN")}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
      हिसाब साफ ✓
    </span>
  );
}

// ---- Transaction Row ----
function TransactionRow({
  txn,
  onMarkPaid,
  onDelete,
  onShare,
}: {
  txn: UdhaarTransaction;
  onMarkPaid: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const isGive = txn.txType === "give";
  return (
    <div
      className="flex items-start gap-3 py-3 border-b border-slate-800 last:border-0"
      data-ocid="udhaar.transaction_row"
    >
      <div
        className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${isGive ? "bg-red-500" : "bg-emerald-500"}`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-bold ${isGive ? "text-red-400" : "text-emerald-400"}`}
        >
          {isGive ? "उधार दिया" : "उधार लिया"} — ₹
          {txn.amount.toLocaleString("hi-IN")}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">📅 {txn.date}</p>
        {txn.note && (
          <p className="text-xs text-slate-400 truncate">📝 {txn.note}</p>
        )}
        {txn.status === "paid" && (
          <span className="mt-1 inline-block text-xs bg-emerald-900/60 text-emerald-400 px-2 py-0.5 rounded-lg">
            ✅ Paid
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {txn.status === "pending" && (
          <>
            <button
              type="button"
              onClick={onMarkPaid}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors"
              data-ocid="udhaar.mark_paid_button"
            >
              ✓ Paid
            </button>
            <button
              type="button"
              onClick={onShare}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold transition-colors"
              data-ocid="udhaar.whatsapp_button"
            >
              <MessageCircle size={12} className="inline mr-1" />
              WA
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-400 font-semibold transition-colors"
          data-ocid="udhaar.delete_button"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ---- Customer Detail Panel ----
function CustomerDetailPanel({
  customer,
  shopId,
  providerShopName,
  onClose,
  onInterstitialTrigger,
}: {
  customer: UdhaarCustomer;
  shopId: string;
  providerShopName: string;
  onClose: () => void;
  onInterstitialTrigger: () => void;
}) {
  const { data: transactions = [], refetch } = useUdhaarTransactions(
    customer.id,
    shopId,
  );
  const addTxn = useAddUdhaarTransaction(shopId);
  const markPaid = useMarkUdhaarTransactionPaid(shopId);
  const deleteTxn = useDeleteUdhaarTransaction(shopId);

  const [amount, setAmount] = useState("");
  const [txType, setTxType] = useState<"give" | "take">("give");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  const balance = getBalance(transactions);
  const pendingCount = transactions.filter(
    (t) => t.status === "pending",
  ).length;

  const handleAddTxn = async () => {
    const val = Number.parseFloat(amount);
    if (Number.isNaN(val) || val <= 0) {
      toast.error("सही रकम डालें");
      return;
    }
    await addTxn.mutateAsync({
      customerId: customer.id,
      amount: val,
      txType,
      date,
      note,
    });
    setAmount("");
    setNote("");
    void refetch();
    toast.success("Transaction save ho gaya! ✅");
    onInterstitialTrigger();
  };

  const handleMarkPaid = async (txId: string) => {
    await markPaid.mutateAsync({ txId, customerId: customer.id });
    void refetch();
    toast.success("Paid mark kar diya ✅");
  };

  const handleDelete = async (txId: string) => {
    if (!confirm("Yeh transaction delete karein?")) return;
    await deleteTxn.mutateAsync({ txId, customerId: customer.id });
    void refetch();
    toast.success("Transaction delete ho gaya");
  };

  const handleWhatsAppShare = (txn: UdhaarTransaction) => {
    const shareBalance = txn.txType === "give" ? txn.amount : -txn.amount;
    const absAmt = Math.abs(shareBalance).toLocaleString("hi-IN");
    const msg = `नमस्ते ${customer.name}, आपका ₹${absAmt} का हिसाब बकाया है। - ${providerShopName}. यह हिसाब *Digital Zindagi* ऐप के माध्यम से भेजा गया है।`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    onInterstitialTrigger();
  };

  const handleShareBalance = () => {
    if (balance === 0) {
      toast.info("हिसाब साफ है");
      return;
    }
    const absAmt = Math.abs(balance).toLocaleString("hi-IN");
    const direction = balance > 0 ? "आपका" : "हमारा";
    const msg = `नमस्ते ${customer.name}, ${direction} ₹${absAmt} का हिसाब बकाया है। - ${providerShopName}. यह हिसाब *Digital Zindagi* ऐप के माध्यम से भेजा गया है।`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    onInterstitialTrigger();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, #064e3b, #1e3a5f)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          data-ocid="udhaar.back_button"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-base truncate">
            {customer.name}
          </h2>
          <p className="text-white/60 text-xs flex items-center gap-1">
            <Phone size={10} /> {customer.mobile}
            {pendingCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <BalanceBadge balance={balance} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add Transaction */}
        <div className="mx-3 mt-3 bg-slate-900 rounded-2xl border border-slate-700 p-4 space-y-3">
          <h3 className="text-emerald-400 text-sm font-bold">
            💰 नया Transaction
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="रकम (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-2 w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-600"
              data-ocid="udhaar.amount_input"
            />
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value as "give" | "take")}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-600"
              data-ocid="udhaar.type_select"
            >
              <option value="give">उधार दिया (Debit)</option>
              <option value="take">उधार लिया (Credit)</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-600"
              data-ocid="udhaar.date_input"
            />
          </div>
          <input
            type="text"
            placeholder="नोट (वैकल्पिक)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-600"
            data-ocid="udhaar.note_input"
          />
          <button
            type="button"
            onClick={handleAddTxn}
            disabled={addTxn.isPending}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #059669, #1d4ed8)" }}
            data-ocid="udhaar.save_transaction_button"
          >
            {addTxn.isPending ? "Save हो रहा है..." : "Transaction Save करें"}
          </button>
        </div>

        {/* Share Balance Button */}
        {balance !== 0 && (
          <div className="mx-3 mt-2">
            <button
              type="button"
              onClick={handleShareBalance}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 transition-colors"
              data-ocid="udhaar.share_balance_button"
            >
              <MessageCircle size={16} />
              WhatsApp पर बकाया भेजें
            </button>
          </div>
        )}

        {/* Transaction History */}
        <div className="mx-3 mt-3 mb-6 bg-slate-900 rounded-2xl border border-slate-700 p-4">
          <h3 className="text-slate-300 text-sm font-bold mb-1">
            📜 Transactions ({transactions.length})
          </h3>
          {transactions.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">
              कोई transaction नहीं। ऊपर add करें।
            </p>
          ) : (
            [...transactions]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((txn) => (
                <TransactionRow
                  key={txn.id}
                  txn={txn}
                  onMarkPaid={() => handleMarkPaid(txn.id)}
                  onDelete={() => handleDelete(txn.id)}
                  onShare={() => handleWhatsAppShare(txn)}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function UdhaarBookPage() {
  const { user, loading, isFullAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // shopId is the provider's userId as a string — used as the isolation key in the canister
  const shopId = user ? String(user.userId) : "";

  // On mount, if user changed (e.g. different provider logged in), clear stale Udhaar cache
  useEffect(() => {
    if (shopId) {
      // Prefetch fresh data, ensuring no cross-provider contamination
      qc.invalidateQueries({ queryKey: ["udhaarCustomers"] });
      qc.invalidateQueries({ queryKey: ["allUdhaarTransactions"] });
    }
  }, [shopId, qc]);

  const { data: profileData } = useProviderProfile(user ? user.userId : null);
  const providerShopName =
    profileData?.shopName ??
    profileData?.businessName ??
    user?.name ??
    user?.mobile ??
    "Provider";

  const { data: customers = [], refetch: refetchCustomers } =
    useUdhaarCustomers(shopId);
  const { data: allTxns = [] } = useAllUdhaarTransactions(shopId);

  const addCustomer = useAddUdhaarCustomer(shopId);
  const deleteCustomer = useDeleteUdhaarCustomer(shopId);

  const [custName, setCustName] = useState("");
  const [custMobile, setCustMobile] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<UdhaarCustomer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Interstitial Ad state
  const [showInterstitial, setShowInterstitial] = useState(false);
  const lastInterstitialTime = useRef<number>(0);

  const admobEnabled = (() => {
    try {
      const cfg = JSON.parse(localStorage.getItem("dz_admob_config") ?? "{}");
      return cfg.masterEnabled !== false && cfg.interstitialEnabled === true;
    } catch {
      return false;
    }
  })();

  const customAds: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("dz_custom_internal_ads") ?? "[]");
    } catch {
      return [];
    }
  })();

  const triggerInterstitial = () => {
    if (!admobEnabled) return;
    const now = Date.now();
    // 10-second cooldown to prevent double-firing
    if (now - lastInterstitialTime.current < 10_000) return;
    lastInterstitialTime.current = now;
    setShowInterstitial(true);
  };

  const pendingTotalCount = allTxns.filter(
    (t) => t.status === "pending",
  ).length;

  // ---- Auth guard ----
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0b1220" }}
      >
        <span className="text-emerald-400">Load Ho Raha Hai...</span>
      </div>
    );
  }

  const isProvider = user?.role === UserRole.provider;
  if (!user || (!isProvider && !isFullAdmin)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: "#0b1220" }}
        data-ocid="udhaar.login_required"
      >
        <BookOpen size={52} className="text-emerald-600" />
        <div className="text-center space-y-2">
          <h1 className="text-white text-xl font-bold">📒 उधार बुक</h1>
          <p className="text-slate-400 text-sm max-w-xs">
            यह section सिर्फ Providers के लिए है। कृपया अपने Provider account से login
            करें।
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #059669, #1d4ed8)" }}
          data-ocid="udhaar.login_button"
        >
          <LogIn size={16} />
          Login करें
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-slate-500 text-xs underline"
        >
          वापस जाएं
        </button>
      </div>
    );
  }

  const handleAddCustomer = async () => {
    if (!custName.trim()) {
      toast.error("ग्राहक का नाम जरूरी है");
      return;
    }
    if (!custMobile.trim()) {
      toast.error("मोबाइल नंबर जरूरी है");
      return;
    }
    await addCustomer.mutateAsync({
      name: custName.trim(),
      mobile: custMobile.trim(),
      address: custAddress.trim(),
    });
    setCustName("");
    setCustMobile("");
    setCustAddress("");
    setShowAddForm(false);
    void refetchCustomers();
    toast.success("ग्राहक जोड़ दिया! ✅");
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`${name} और उनके सभी transactions delete करें?`)) return;
    await deleteCustomer.mutateAsync(id);
    void refetchCustomers();
    toast.success("ग्राहक delete हो गया");
  };

  const getCustomerBalance = (customerId: string) => {
    const txns = allTxns.filter(
      (t) => t.customerId === customerId && t.status === "pending",
    );
    return getBalance(txns);
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search),
  );

  if (selectedCustomer) {
    return (
      <CustomerDetailPanel
        customer={selectedCustomer}
        shopId={shopId}
        providerShopName={providerShopName}
        onClose={() => setSelectedCustomer(null)}
        onInterstitialTrigger={triggerInterstitial}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0b1220" }}
    >
      {/* AdMob Banner at top */}
      <AdMobBanner />

      {/* Interstitial Ad overlay */}
      {showInterstitial && (
        <InterstitialAd
          phase="post"
          adBlocked={false}
          customAds={customAds}
          onClose={() => setShowInterstitial(false)}
        />
      )}
      {/* Header */}
      <header
        className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #064e3b, #1e3a5f)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            data-ocid="udhaar.nav_back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-400" />
            <span className="font-bold text-white text-lg">📒 उधार बुक</span>
            {pendingTotalCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingTotalCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
            data-ocid="udhaar.add_customer_button"
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? "बंद करें" : "ग्राहक जोड़ें"}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 max-w-xl mx-auto w-full">
        {/* Add Customer Form */}
        {showAddForm && (
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4 space-y-3">
            <h2 className="text-emerald-400 text-sm font-bold">
              ➕ नया ग्राहक जोड़ें
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="ग्राहक का नाम *"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className="col-span-2 w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-600"
                data-ocid="udhaar.customer_name_input"
              />
              <input
                type="tel"
                placeholder="मोबाइल नंबर *"
                value={custMobile}
                onChange={(e) => setCustMobile(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-600"
                data-ocid="udhaar.customer_mobile_input"
              />
              <input
                type="text"
                placeholder="पता (वैकल्पिक)"
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-600"
                data-ocid="udhaar.customer_address_input"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomer}
              disabled={addCustomer.isPending}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #059669, #16a34a)",
              }}
              data-ocid="udhaar.save_customer_button"
            >
              {addCustomer.isPending ? "जोड़ रहे हैं..." : "ग्राहक Save करें ✅"}
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="नाम या मोबाइल से खोजें..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-600"
            data-ocid="udhaar.search_input"
          />
        </div>

        {/* Summary Row — real-time from canister */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 text-center">
            <p className="text-xl font-bold text-white">{customers.length}</p>
            <p className="text-xs text-slate-400">कुल ग्राहक</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 text-center">
            <p className="text-xl font-bold text-red-400">
              {pendingTotalCount}
            </p>
            <p className="text-xs text-slate-400">Pending Transactions</p>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-slate-200 text-sm font-bold">
              👥 ग्राहकों की सूची
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div
              className="py-10 text-center px-4"
              data-ocid="udhaar.empty_state"
            >
              <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm font-medium">
                {search ? "कोई ग्राहक नहीं मिला" : "अभी कोई ग्राहक नहीं है"}
              </p>
              {!search && (
                <p className="text-slate-600 text-xs mt-1">
                  ऊपर "ग्राहक जोड़ें" पर tap करें
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filtered.map((c) => {
                const balance = getCustomerBalance(c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-3"
                    data-ocid="udhaar.customer_row"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {c.name}
                      </p>
                      <p className="text-slate-400 text-xs">📞 {c.mobile}</p>
                      <div className="mt-1">
                        <BalanceBadge balance={balance} />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(c)}
                        className="px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                        data-ocid="udhaar.open_customer_button"
                      >
                        खोलें
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(c.id, c.name)}
                        className="p-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-400 transition-colors"
                        data-ocid="udhaar.delete_customer_button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="py-3 text-center flex-shrink-0">
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} Digital Zindagi — उधार बुक
        </p>
      </div>
    </div>
  );
}
