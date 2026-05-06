import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Coins,
  MessageSquare,
  RefreshCw,
  Send,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { getAdminToken } from "../hooks/useAdminSession";
import {
  useAddCoin,
  useAdminApproveCryptoWithdrawal,
  useAdminGetAllCryptoUsers,
  useAdminGetCryptoStats,
  useAdminGetAllWithdrawals as useAdminGetCryptoWithdrawals,
  useAdminGetAllTickets as useAdminGetTickets,
  useAdminRejectCryptoWithdrawal,
  useAdminResetMpin,
  useAllCoins,
  useBlockCryptoUser,
  useCryptoConfig,
  useDeleteCoin,
  useFreezeCryptoUser,
  useReplyToTicket,
  useUpdateCoin as useToggleCoinListing,
  useUpdateCryptoConfig,
  useUpdateTicketStatus,
} from "../hooks/useCryptoQueries";
import type {
  CryptoConfig,
  CryptoWithdrawal,
  SupportTicket,
} from "../hooks/useCryptoQueries";

// ─── Small helpers ────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-medium ${
        ok
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
          : "bg-red-50 text-red-800 border border-red-200"
      }`}
    >
      {ok ? "✓ " : "✗ "}
      {msg}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  open,
  toggle,
}: {
  icon: React.ReactNode;
  title: string;
  open: boolean;
  toggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-lg border border-emerald-200 text-left"
      data-ocid="crypto_admin.section_toggle"
    >
      <span className="flex items-center gap-2.5 font-semibold text-emerald-800">
        {icon} {title}
      </span>
      {open ? (
        <ChevronDown className="w-4 h-4 text-emerald-600" />
      ) : (
        <ChevronRight className="w-4 h-4 text-emerald-600" />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    frozen: "bg-yellow-100 text-yellow-800",
    blocked: "bg-red-100 text-red-800",
    pending: "bg-blue-100 text-blue-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    resolved: "bg-emerald-100 text-emerald-800",
    low: "bg-muted text-muted-foreground",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? "bg-muted text-foreground"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-IN");
}

// ─── Section 1: Module Settings ──────────────────────────────────────────────

function ModuleSettings() {
  const { data: cfg, isLoading } = useCryptoConfig();
  const updateMut = useUpdateCryptoConfig();
  const [form, setForm] = useState<CryptoConfig | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const current = form ?? cfg ?? null;

  function set<K extends keyof CryptoConfig>(k: K, v: CryptoConfig[K]) {
    setForm((prev) => ({ ...(prev ?? cfg!), [k]: v }));
  }

  async function save() {
    if (!current) return;
    try {
      await updateMut.mutateAsync(current);
      setToast({ msg: "Digital Invest settings updated!", ok: true });
      setForm(null);
    } catch (e) {
      setToast({ msg: (e as Error).message ?? "Save fail hua", ok: false });
    }
    setTimeout(() => setToast(null), 4000);
  }

  if (isLoading)
    return (
      <div className="py-6 text-center text-muted-foreground text-sm">
        Loading settings...
      </div>
    );
  if (!current) return null;

  return (
    <div className="space-y-5 p-4">
      {/* Module toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Digital Invest Module</p>
          <p className="text-xs text-muted-foreground">
            Users ke liye module ON/OFF
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("isEnabled", !current.isEnabled)}
          className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
            current.isEnabled ? "bg-emerald-600" : "bg-muted"
          }`}
          data-ocid="crypto_admin.module_toggle"
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${current.isEnabled ? "translate-x-5" : ""}`}
          />
        </button>
      </div>

      <hr className="border-border" />

      {/* Fees */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="buy-fee"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Buy Fee (%)
          </label>
          <input
            id="buy-fee"
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={current.buyFeePercent}
            onChange={(e) =>
              set("buyFeePercent", Number.parseFloat(e.target.value) || 0)
            }
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-ocid="crypto_admin.buy_fee_input"
          />
        </div>
        <div>
          <label
            htmlFor="sell-fee"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Sell Fee (%)
          </label>
          <input
            id="sell-fee"
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={current.sellFeePercent}
            onChange={(e) =>
              set("sellFeePercent", Number.parseFloat(e.target.value) || 0)
            }
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-ocid="crypto_admin.sell_fee_input"
          />
        </div>
      </div>

      {/* Withdrawal limits */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="min-withdrawal"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Min Withdrawal ₹
          </label>
          <input
            id="min-withdrawal"
            type="number"
            min="1"
            value={current.minWithdrawal}
            onChange={(e) =>
              set("minWithdrawal", Number.parseInt(e.target.value) || 0)
            }
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-ocid="crypto_admin.min_withdrawal_input"
          />
        </div>
        <div>
          <label
            htmlFor="max-withdrawal"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Max Withdrawal ₹
          </label>
          <input
            id="max-withdrawal"
            type="number"
            min="1"
            value={current.maxWithdrawal}
            onChange={(e) =>
              set("maxWithdrawal", Number.parseInt(e.target.value) || 0)
            }
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-ocid="crypto_admin.max_withdrawal_input"
          />
        </div>
      </div>

      {/* Daily Reward */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground text-sm">Daily Reward</p>
          <p className="text-xs text-muted-foreground">
            Daily check-in reward ON/OFF
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            set("isDailyRewardEnabled", !current.isDailyRewardEnabled)
          }
          className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
            current.isDailyRewardEnabled ? "bg-emerald-600" : "bg-muted"
          }`}
          data-ocid="crypto_admin.daily_reward_toggle"
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${current.isDailyRewardEnabled ? "translate-x-5" : ""}`}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="daily-reward-amt"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Daily Reward Amount ₹
          </label>
          <input
            id="daily-reward-amt"
            type="number"
            min="0"
            value={current.dailyRewardAmount}
            onChange={(e) =>
              set("dailyRewardAmount", Number.parseInt(e.target.value) || 0)
            }
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-ocid="crypto_admin.daily_reward_input"
          />
        </div>
        <div>
          <label
            htmlFor="risk-threshold"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            High Risk Threshold (%)
          </label>
          <input
            id="risk-threshold"
            type="number"
            min="1"
            max="100"
            value={current.highRiskThreshold}
            onChange={(e) =>
              set("highRiskThreshold", Number.parseInt(e.target.value) || 20)
            }
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-ocid="crypto_admin.risk_threshold_input"
          />
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <button
        type="button"
        onClick={save}
        disabled={updateMut.isPending}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        data-ocid="crypto_admin.save_settings_button"
      >
        {updateMut.isPending ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

// ─── Section 2: Coin Management ──────────────────────────────────────────────

function CoinManagement() {
  const { data: coins = [], isLoading } = useAllCoins();
  const addCoin = useAddCoin();
  const toggleCoin = useToggleCoinListing();
  const deleteCoin = useDeleteCoin();
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    coinGeckoId: "",
    coingeckoId: "",
    logoUrl: "",
  });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.symbol || !form.coinGeckoId) {
      setToast({
        msg: "Name, Symbol aur CoinGecko ID required hain",
        ok: false,
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    try {
      await addCoin.mutateAsync({
        ...form,
        coinGeckoId: form.coinGeckoId || form.coingeckoId,
      });
      setForm({
        name: "",
        symbol: "",
        coinGeckoId: "",
        coingeckoId: "",
        logoUrl: "",
      });
      setToast({ msg: "Coin added!", ok: true });
    } catch (e) {
      setToast({ msg: (e as Error).message ?? "Add fail hua", ok: false });
    }
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-5 p-4">
      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border"
      >
        <p className="text-sm font-semibold text-foreground">Add New Coin</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="coin-name"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Name *
            </label>
            <input
              id="coin-name"
              type="text"
              placeholder="Bitcoin"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-ocid="crypto_admin.coin_name_input"
              required
            />
          </div>
          <div>
            <label
              htmlFor="coin-symbol"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Symbol *
            </label>
            <input
              id="coin-symbol"
              type="text"
              placeholder="BTC"
              value={form.symbol}
              onChange={(e) =>
                setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))
              }
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-ocid="crypto_admin.coin_symbol_input"
              required
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="coin-coingecko"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            CoinGecko ID *{" "}
            <span className="text-emerald-700">
              (coingecko.com/en/coins पर find करें)
            </span>
          </label>
          <input
            id="coin-coingecko"
            type="text"
            placeholder="bitcoin"
            value={form.coingeckoId}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                coingeckoId: e.target.value.toLowerCase(),
              }))
            }
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-ocid="crypto_admin.coin_coingecko_input"
            required
          />
        </div>
        <div>
          <label
            htmlFor="coin-logo"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Logo URL (Cloudinary)
          </label>
          <input
            id="coin-logo"
            type="url"
            placeholder="https://res.cloudinary.com/..."
            value={form.logoUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, logoUrl: e.target.value }))
            }
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-ocid="crypto_admin.coin_logo_input"
          />
        </div>
        {toast && <Toast msg={toast.msg} ok={toast.ok} />}
        <button
          type="submit"
          disabled={addCoin.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          data-ocid="crypto_admin.add_coin_button"
        >
          {addCoin.isPending ? "Adding..." : "+ Add Coin"}
        </button>
      </form>

      {/* Coin list */}
      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Loading coins...
        </div>
      ) : coins.length === 0 ? (
        <div
          className="text-center py-6 text-muted-foreground text-sm"
          data-ocid="crypto_admin.coins_empty_state"
        >
          Koi coin listed nahi hai.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  Coin
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  CoinGecko ID
                </th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                  Listed
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin, i) => (
                <tr
                  key={coin.id}
                  className="border-b border-border hover:bg-muted/20"
                  data-ocid={`crypto_admin.coin_row.${i + 1}`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {coin.logoUrl && (
                        <img
                          src={coin.logoUrl}
                          alt={coin.symbol}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {coin.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {coin.symbol}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {coin.coingeckoId}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        toggleCoin.mutate({
                          id: coin.id,
                          isListed: !coin.isListed,
                        })
                      }
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                        coin.isListed ? "bg-emerald-600" : "bg-muted"
                      }`}
                      data-ocid={`crypto_admin.coin_listed_toggle.${i + 1}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${coin.isListed ? "translate-x-4" : ""}`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`"${coin.name}" delete karein?`))
                          deleteCoin.mutate(coin.id);
                      }}
                      className="text-red-600 hover:text-red-700 p-1 rounded"
                      data-ocid={`crypto_admin.coin_delete_button.${i + 1}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Section 3: Withdrawal Approvals ─────────────────────────────────────────

function WithdrawalApprovals() {
  const {
    data: withdrawals = [],
    isLoading,
    refetch,
  } = useAdminGetCryptoWithdrawals();
  const approveMut = useAdminApproveCryptoWithdrawal();
  const rejectMut = useAdminRejectCryptoWithdrawal();
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [approveNote, setApproveNote] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const shown =
    activeTab === "pending"
      ? withdrawals.filter((w) => w.status === "pending")
      : withdrawals;

  async function handleApprove(w: CryptoWithdrawal) {
    try {
      await approveMut.mutateAsync({
        withdrawalId: w.id,
        adminNote: approveNote[w.id] ?? "",
      });
      setToast({ msg: "Withdrawal approved!", ok: true });
    } catch (e) {
      setToast({ msg: (e as Error).message ?? "Approve fail", ok: false });
    }
    setTimeout(() => setToast(null), 4000);
  }

  async function handleReject() {
    if (!rejectModal) return;
    try {
      await rejectMut.mutateAsync({
        withdrawalId: rejectModal.id,
        adminNote: rejectNote,
      });
      setRejectModal(null);
      setRejectNote("");
      setToast({ msg: "Withdrawal rejected.", ok: true });
    } catch (e) {
      setToast({ msg: (e as Error).message ?? "Reject fail", ok: false });
    }
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-4 p-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === t
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-ocid={`crypto_admin.withdrawals_${t}_tab`}
          >
            {t === "pending" ? "Pending" : "All Withdrawals"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => refetch()}
          className="ml-auto p-1.5 rounded-lg hover:bg-muted"
          data-ocid="crypto_admin.withdrawals_refresh"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Loading...
        </div>
      ) : shown.length === 0 ? (
        <div
          className="text-center py-6 text-muted-foreground text-sm"
          data-ocid="crypto_admin.withdrawals_empty_state"
        >
          {activeTab === "pending"
            ? "Koi pending withdrawal nahi hai."
            : "Koi withdrawal nahi mili."}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((w, i) => (
            <div
              key={w.id}
              className="border border-border rounded-xl p-4 space-y-3"
              data-ocid={`crypto_admin.withdrawal_item.${i + 1}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {w.userId.slice(0, 16)}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    UPI: {w.upiId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(Number(w.createdAt) / 1_000_000)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-700">
                    ₹{fmt(w.amount)}
                  </p>
                  <StatusBadge status={w.status} />
                </div>
              </div>
              {w.status === "pending" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Admin note (optional)"
                    value={approveNote[w.id] ?? ""}
                    onChange={(e) =>
                      setApproveNote((p) => ({ ...p, [w.id]: e.target.value }))
                    }
                    className="w-full border border-input rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    data-ocid={`crypto_admin.withdrawal_note_input.${i + 1}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(w)}
                      disabled={approveMut.isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      data-ocid={`crypto_admin.withdrawal_approve_button.${i + 1}`}
                    >
                      {approveMut.isPending ? "..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectModal({ id: w.id })}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded-lg text-xs font-semibold border border-red-200 transition-colors"
                      data-ocid={`crypto_admin.withdrawal_reject_button.${i + 1}`}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
              {w.adminNote && (
                <p className="text-xs text-muted-foreground italic">
                  Note: {w.adminNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          data-ocid="crypto_admin.reject_dialog"
        >
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Withdrawal Reject Karein
              </h3>
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="p-1 rounded hover:bg-muted"
                data-ocid="crypto_admin.reject_close_button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label
                htmlFor="reject-reason"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Rejection Reason *
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                placeholder="Reason for rejection..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                data-ocid="crypto_admin.reject_reason_textarea"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="flex-1 border border-border py-2 rounded-lg text-sm font-medium hover:bg-muted"
                data-ocid="crypto_admin.reject_cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectNote.trim() || rejectMut.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                data-ocid="crypto_admin.reject_confirm_button"
              >
                {rejectMut.isPending ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section 4: User Management ──────────────────────────────────────────────

function UserManagement() {
  const { data: users = [], isLoading, refetch } = useAdminGetAllCryptoUsers();
  const freezeMut = useFreezeCryptoUser();
  const blockMut = useBlockCryptoUser();
  const resetMpinMut = useAdminResetMpin();
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const filtered = users.filter(
    (u) => !search || u.userId.toLowerCase().includes(search.toLowerCase()),
  );

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      setToast({ msg, ok: true });
    } catch (e) {
      setToast({ msg: (e as Error).message ?? "Error", ok: false });
    }
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="User ID se search karein..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          data-ocid="crypto_admin.user_search_input"
        />
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-muted border border-border"
          data-ocid="crypto_admin.users_refresh"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Loading users...
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-6 text-muted-foreground text-sm"
          data-ocid="crypto_admin.users_empty_state"
        >
          Koi user nahi mila.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  User ID
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                  Balance
                </th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.userId}
                  className="border-b border-border hover:bg-muted/20"
                  data-ocid={`crypto_admin.user_row.${i + 1}`}
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground text-xs">
                      {u.userId.slice(0, 20)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dep: ₹{fmt(u.totalDeposited)}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                    ₹{fmt(u.balance)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          act(
                            () =>
                              freezeMut.mutateAsync({
                                userId: u.userId,
                                isFrozen: true,
                                reason: "Admin action",
                              }),
                            "User frozen!",
                          )
                        }
                        disabled={u.status === "frozen" || freezeMut.isPending}
                        className="px-2 py-1 text-xs rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 disabled:opacity-40 transition-colors"
                        data-ocid={`crypto_admin.user_freeze_button.${i + 1}`}
                      >
                        Freeze
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          act(
                            () =>
                              blockMut.mutateAsync({
                                userId: u.userId,
                                isBlocked: true,
                                reason: "Admin action",
                              }),
                            "User blocked!",
                          )
                        }
                        disabled={u.status === "blocked" || blockMut.isPending}
                        className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-40 transition-colors"
                        data-ocid={`crypto_admin.user_block_button.${i + 1}`}
                      >
                        Block
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          act(
                            () => resetMpinMut.mutateAsync(u.userId),
                            "MPIN reset!",
                          )
                        }
                        disabled={resetMpinMut.isPending}
                        className="px-2 py-1 text-xs rounded-lg bg-muted text-muted-foreground border border-border hover:bg-muted/80 disabled:opacity-40 transition-colors"
                        data-ocid={`crypto_admin.user_reset_mpin_button.${i + 1}`}
                      >
                        MPIN Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Section 5: Stats Dashboard ───────────────────────────────────────────────

function StatsDashboard() {
  const { data: stats, isLoading, refetch } = useAdminGetCryptoStats();

  const cards = [
    {
      label: "Total Active Users",
      value: stats ? String(stats.totalUsers) : "-",
      icon: <Users className="w-5 h-5" />,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Total App Balance",
      value: stats ? `₹${fmt(stats.totalAppBalance)}` : "-",
      icon: <Wallet className="w-5 h-5" />,
      color: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Total Trading Volume",
      value: stats ? `₹${fmt(stats.totalTradingVolume)}` : "-",
      icon: <BarChart2 className="w-5 h-5" />,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Total Commissions",
      value: stats ? `₹${fmt(stats.totalCommissions)}` : "-",
      icon: <Coins className="w-5 h-5" />,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
          data-ocid="crypto_admin.stats_refresh"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Loading stats...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c, i) => (
            <div
              key={c.label}
              className="border border-border rounded-xl p-4 space-y-2"
              data-ocid={`crypto_admin.stat_card.${i + 1}`}
            >
              <div className={`inline-flex p-2 rounded-lg ${c.color}`}>
                {c.icon}
              </div>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {c.value}
              </p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section 6: Support Tickets ──────────────────────────────────────────────

function SupportTickets() {
  const { data: tickets = [], isLoading } = useAdminGetTickets();
  const replyMut = useReplyToTicket();
  const statusMut = useUpdateTicketStatus();
  const [filter, setFilter] = useState<"all" | SupportTicket["status"]>("all");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const shown =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    try {
      await replyMut.mutateAsync({
        userId: "admin",
        ticketId: selected.id,
        message: reply,
        isAdmin: true,
      });
      setReply("");
      setToast({ msg: "Reply sent!", ok: true });
    } catch (e) {
      setToast({ msg: (e as Error).message ?? "Error", ok: false });
    }
    setTimeout(() => setToast(null), 4000);
  }

  async function changeStatus(status: SupportTicket["status"]) {
    if (!selected) return;
    try {
      await statusMut.mutateAsync({ ticketId: selected.id, status });
      setSelected((t) => (t ? { ...t, status } : null));
    } catch {}
  }

  const filterTabs: Array<{
    key: "all" | SupportTicket["status"];
    label: string;
  }> = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-1.5 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === tab.key
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-ocid={`crypto_admin.ticket_filter.${tab.key}`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1 opacity-70">
                ({tickets.filter((t) => t.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Loading tickets...
        </div>
      ) : shown.length === 0 ? (
        <div
          className="text-center py-6 text-muted-foreground text-sm"
          data-ocid="crypto_admin.tickets_empty_state"
        >
          Koi ticket nahi mili.
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t)}
              className="w-full text-left border border-border rounded-xl p-3 hover:bg-muted/30 transition-colors"
              data-ocid={`crypto_admin.ticket_item.${i + 1}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {t.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.userId.slice(0, 16)}... · {t.category}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge status={t.status} />
                  <StatusBadge status={t.priority} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {timeAgo(Number(t.createdAt) / 1_000_000)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Ticket slide-over */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          data-ocid="crypto_admin.ticket_sheet"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelected(null)}
            onKeyDown={(e) => e.key === "Escape" && setSelected(null)}
            role="button"
            tabIndex={-1}
            aria-label="Close ticket panel"
          />
          <div className="relative bg-card w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {selected.subject}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selected.userId.slice(0, 24)}...
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selected.status}
                  onChange={(e) =>
                    changeStatus(e.target.value as SupportTicket["status"])
                  }
                  className="text-xs border border-input rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-ocid="crypto_admin.ticket_status_select"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-muted"
                  data-ocid="crypto_admin.ticket_close_button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!selected ||
              !("replies" in selected) ||
              (selected as SupportTicket & { replies?: unknown[] }).replies
                ?.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Koi reply nahi hai abhi.
                </p>
              ) : (
                (
                  (
                    selected as SupportTicket & {
                      replies?: Array<{
                        id: string;
                        isAdmin: boolean;
                        message: string;
                        createdAt?: bigint;
                      }>;
                    }
                  ).replies ?? []
                ).map((r) => (
                  <div
                    key={r.id}
                    className={`flex ${
                      r.isAdmin ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        r.isAdmin
                          ? "bg-emerald-600 text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p>{r.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          r.isAdmin
                            ? "text-emerald-100"
                            : "text-muted-foreground"
                        }`}
                      >
                        {timeAgo(
                          r.createdAt ? Number(r.createdAt) / 1_000_000 : 0,
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border p-3 bg-card">
              {toast && <Toast msg={toast.msg} ok={toast.ok} />}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Admin reply likhein..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && sendReply()
                  }
                  className="flex-1 border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-ocid="crypto_admin.ticket_reply_input"
                />
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={!reply.trim() || replyMut.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white p-2 rounded-xl transition-colors"
                  data-ocid="crypto_admin.ticket_reply_send_button"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

type Section =
  | "settings"
  | "coins"
  | "withdrawals"
  | "users"
  | "stats"
  | "tickets";

export default function CryptoAdminPanel() {
  const [open, setOpen] = useState<Record<Section, boolean>>({
    settings: true,
    coins: false,
    withdrawals: false,
    users: false,
    stats: false,
    tickets: false,
  });

  function toggle(s: Section) {
    setOpen((p) => ({ ...p, [s]: !p[s] }));
  }

  const sections: Array<{
    key: Section;
    icon: React.ReactNode;
    title: string;
    content: React.ReactNode;
  }> = [
    {
      key: "settings",
      icon: <Settings className="w-4 h-4" />,
      title: "Module Settings",
      content: <ModuleSettings />,
    },
    {
      key: "coins",
      icon: <Coins className="w-4 h-4" />,
      title: "Coin Management",
      content: <CoinManagement />,
    },
    {
      key: "withdrawals",
      icon: <Wallet className="w-4 h-4" />,
      title: "Withdrawal Approvals",
      content: <WithdrawalApprovals />,
    },
    {
      key: "users",
      icon: <Users className="w-4 h-4" />,
      title: "User Management",
      content: <UserManagement />,
    },
    {
      key: "stats",
      icon: <BarChart2 className="w-4 h-4" />,
      title: "Stats Dashboard",
      content: <StatsDashboard />,
    },
    {
      key: "tickets",
      icon: <MessageSquare className="w-4 h-4" />,
      title: "Support Tickets",
      content: <SupportTickets />,
    },
  ];

  return (
    <div className="space-y-3" data-ocid="crypto_admin.panel">
      <div className="px-1 pb-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-emerald-600 rounded-xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-base leading-tight">
              Digital Invest
            </h2>
            <p className="text-xs text-muted-foreground">
              Admin Control Center
            </p>
          </div>
        </div>
      </div>

      {sections.map((s) => (
        <div
          key={s.key}
          className="rounded-xl border border-border overflow-hidden"
        >
          <SectionHeader
            icon={s.icon}
            title={s.title}
            open={open[s.key]}
            toggle={() => toggle(s.key)}
          />
          {open[s.key] && <div className="bg-card">{s.content}</div>}
        </div>
      ))}
    </div>
  );
}
