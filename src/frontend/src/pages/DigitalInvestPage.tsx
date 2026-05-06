import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  type CoinPriceMap,
  type CryptoCoin,
  type SupportTicket,
  useBuyCoin,
  useClaimDailyReward,
  useCreateSupportTicket,
  useCryptoConfig,
  useListedCoins,
  useLiveCoinPrices,
  useReplyToTicket,
  useRequestCryptoWithdrawal,
  useRequestDeposit,
  useSellCoin,
  useSetMpin,
  useTicketReplies,
  useUserCryptoTransactions,
  useUserCryptoWallet,
  useUserCryptoWithdrawals,
  useUserPortfolio,
  useUserTickets,
} from "../hooks/useCryptoQueries";

// ─── helpers ─────────────────────────────────────────────────────────────────

function inr(n: number) {
  return `\u20b9${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmt(n: number, dec = 6) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: dec,
  });
}

function formatDate(ts: bigint | number) {
  return new Date(
    typeof ts === "bigint" ? Number(ts) / 1_000_000 : ts,
  ).toLocaleDateString("en-IN");
}

function gainColor(pct: number) {
  return pct >= 0 ? "text-emerald-600" : "text-red-500";
}

// ─── shared mini-components ──────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function BalancePill({ balance }: { balance: number }) {
  return (
    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
      {inr(balance)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    "in-progress": "bg-yellow-100 text-yellow-700",
    resolved: "bg-emerald-100 text-emerald-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
    completed: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        map[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

// ─── MPIN Setup Modal ─────────────────────────────────────────────────────────

function MpinSetupModal({
  userId,
  onClose,
}: { userId: string; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const setMpin = useSetMpin();

  const submit = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      toast.error("6 digit numeric MPIN enter karein");
      return;
    }
    if (pin !== confirm) {
      toast.error("MPIN match nahi kiya");
      return;
    }
    try {
      await setMpin.mutateAsync({ userId, mpin: pin });
      toast.success("MPIN set ho gaya!");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
      role="presentation"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
        onKeyDown={(e) => e.stopPropagation()}
        data-ocid="mpin.dialog"
      >
        <h3 className="text-lg font-bold text-emerald-700 mb-4">
          MPIN Set Karein
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Transaction security ke liye 6-digit MPIN zaroor set karein.
        </p>
        <label className="block text-sm font-medium mb-1" htmlFor="mpin-new">
          Naya MPIN
        </label>
        <input
          id="mpin-new"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full border rounded-lg px-3 py-2 mb-3 text-center text-xl tracking-widest"
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"
          data-ocid="mpin.input"
        />
        <label
          className="block text-sm font-medium mb-1"
          htmlFor="mpin-confirm"
        >
          MPIN Confirm Karein
        </label>
        <input
          id="mpin-confirm"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          className="w-full border rounded-lg px-3 py-2 mb-4 text-center text-xl tracking-widest"
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"
          data-ocid="mpin.confirm_input"
        />
        <button
          type="button"
          onClick={submit}
          disabled={setMpin.isPending}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
          data-ocid="mpin.submit_button"
        >
          {setMpin.isPending ? "Saving..." : "MPIN Save Karein"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-2 text-sm text-muted-foreground"
          data-ocid="mpin.cancel_button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Buy/Sell Trading Modal ───────────────────────────────────────────────────

function TradingModal({
  coin,
  price,
  change24h,
  userId,
  walletBalance,
  feePercent,
  hasMpin,
  onClose,
}: {
  coin: CryptoCoin;
  price: number;
  change24h: number;
  userId: string;
  walletBalance: number;
  feePercent: number;
  hasMpin: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState("");
  const [mpin, setMpin] = useState("");
  const [showMpinSetup, setShowMpinSetup] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const buyCoin = useBuyCoin();
  const sellCoin = useSellCoin();

  const fee = feePercent / 100;
  const buyQty = price > 0 ? (Number(amount) / price) * (1 - fee) : 0;
  const sellProceeds = Number(qty) * price * (1 - fee);
  const sellFeeAmt = Number(qty) * price * fee;

  const handleSubmit = async () => {
    if (cooldown) return;
    if (!mpin || mpin.length !== 6) {
      toast.error("6-digit MPIN enter karein");
      return;
    }
    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
    try {
      if (tab === "buy") {
        await buyCoin.mutateAsync({
          userId,
          coinId: coin.id,
          amountInFunds: Number(amount),
          currentPrice: price,
          mpin,
        });
        toast.success(`${coin.symbol} buy ho gaya!`);
      } else {
        await sellCoin.mutateAsync({
          userId,
          coinId: coin.id,
          quantity: Number(qty),
          currentPrice: price,
          mpin,
        });
        toast.success(`${coin.symbol} sell ho gaya!`);
      }
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (showMpinSetup)
    return (
      <MpinSetupModal userId={userId} onClose={() => setShowMpinSetup(false)} />
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
      role="presentation"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
        onKeyDown={(e) => e.stopPropagation()}
        data-ocid="trade.dialog"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {coin.logoUrl && (
              <img
                src={coin.logoUrl}
                alt={coin.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <p className="font-bold text-base">{coin.name}</p>
              <p className="text-xs text-muted-foreground">
                {inr(price)}{" "}
                <span className={gainColor(change24h)}>
                  {change24h >= 0 ? "+" : ""}
                  {change24h.toFixed(2)}%
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-muted-foreground"
            data-ocid="trade.close_button"
          >
            &times;
          </button>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-emerald-200 mb-4">
          {(["buy", "sell"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold transition ${tab === t ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}
              data-ocid={`trade.${t}_tab`}
            >
              {t === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        {!hasMpin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
            Pehle MPIN set karein —{" "}
            <button
              type="button"
              className="underline font-medium"
              onClick={() => setShowMpinSetup(true)}
              data-ocid="trade.set_mpin_button"
            >
              Set MPIN
            </button>
          </div>
        )}

        {tab === "buy" ? (
          <>
            <label className="text-sm font-medium" htmlFor="trade-amount">
              Amount (\u20b9)
            </label>
            <input
              id="trade-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 my-2"
              placeholder="Kitna invest karein"
              data-ocid="trade.buy_amount_input"
            />
            <p className="text-xs text-muted-foreground">
              \u2248 {fmt(buyQty)} {coin.symbol} &middot; Fee:{" "}
              {inr(Number(amount) * fee)}
            </p>
          </>
        ) : (
          <>
            <label className="text-sm font-medium" htmlFor="trade-qty">
              Quantity ({coin.symbol})
            </label>
            <input
              id="trade-qty"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 my-2"
              placeholder={`Kitna ${coin.symbol} bechein`}
              data-ocid="trade.sell_qty_input"
            />
            <p className="text-xs text-muted-foreground">
              Milega: {inr(sellProceeds)} &middot; Fee: {inr(sellFeeAmt)}
            </p>
          </>
        )}

        <label className="text-sm font-medium mt-3 block" htmlFor="trade-mpin">
          6-Digit MPIN
        </label>
        <input
          id="trade-mpin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={mpin}
          onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
          className="w-full border rounded-lg px-3 py-2 my-2 text-center text-xl tracking-widest"
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"
          data-ocid="trade.mpin_input"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            cooldown || buyCoin.isPending || sellCoin.isPending || !hasMpin
          }
          className="w-full mt-3 py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50 hover:bg-emerald-700 transition"
          data-ocid="trade.submit_button"
        >
          {cooldown
            ? "Please wait..."
            : tab === "buy"
              ? `Buy ${coin.symbol}`
              : `Sell ${coin.symbol}`}
        </button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Wallet: {inr(walletBalance)}
        </p>
      </div>
    </div>
  );
}

// ─── MARKET TAB ───────────────────────────────────────────────────────────────

function MarketTab({
  userId,
  walletBalance,
  feePercent,
  hasMpin,
}: {
  userId: string;
  walletBalance: number;
  feePercent: number;
  hasMpin: boolean;
}) {
  const { data: coins = [], isLoading } = useListedCoins();
  const coinGeckoIds = coins.map((c) => c.coinGeckoId).filter(Boolean);
  const { data: prices = {} as CoinPriceMap } = useLiveCoinPrices(coinGeckoIds);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CryptoCoin | null>(null);

  const filtered = coins.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <input
          type="search"
          placeholder="Coin dhundein..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-emerald-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          data-ocid="market.search_input"
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="flex-1 overflow-y-auto" data-ocid="market.list">
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
              data-ocid="market.empty_state"
            >
              <span className="text-4xl mb-2">\ud83d\udd0d</span>
              <p>Koi coin nahi mila</p>
            </div>
          ) : (
            filtered.map((coin, idx) => {
              const pd = prices[coin.coinGeckoId];
              const usdPrice = pd?.usd ?? 0;
              const change = pd?.usd_24h_change ?? 0;
              const inrPrice = usdPrice * 83.5;
              const isHighRisk = change <= -20;
              return (
                <button
                  key={coin.id}
                  type="button"
                  onClick={() => setSelected(coin)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/40 transition text-left"
                  data-ocid={`market.item.${idx + 1}`}
                >
                  {coin.logoUrl ? (
                    <img
                      src={coin.logoUrl}
                      alt={coin.symbol}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                      {coin.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{coin.name}</span>
                      {isHighRisk && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                          \u26a0 High Risk
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {coin.symbol}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {inrPrice > 0 ? inr(inrPrice) : "\u2014"}
                    </p>
                    <p className={`text-xs font-medium ${gainColor(change)}`}>
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {selected &&
        (() => {
          const pd = prices[selected.coinGeckoId];
          const inrPrice = (pd?.usd ?? 0) * 83.5;
          const change = pd?.usd_24h_change ?? 0;
          return (
            <TradingModal
              coin={selected}
              price={inrPrice}
              change24h={change}
              userId={userId}
              walletBalance={walletBalance}
              feePercent={feePercent}
              hasMpin={hasMpin}
              onClose={() => setSelected(null)}
            />
          );
        })()}
    </div>
  );
}

// ─── PORTFOLIO TAB ────────────────────────────────────────────────────────────

function PortfolioTab({
  userId,
  config,
}: {
  userId: string;
  config: { dailyRewardAmount: number } | null;
}) {
  const { data: holdings = [], isLoading } = useUserPortfolio(userId);
  const { data: prices = {} as CoinPriceMap } = useLiveCoinPrices([
    "bitcoin",
    "ethereum",
    "binancecoin",
    "solana",
  ]);
  const { data: wallet } = useUserCryptoWallet(userId);
  const claimReward = useClaimDailyReward();

  const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0);
  const totalValue = holdings.reduce((s, h) => {
    const p = (prices[h.coinId]?.usd ?? h.averageBuyPrice / 83.5) * 83.5;
    return s + h.quantity * p;
  }, 0);
  const gainLoss = totalValue - totalCost;
  const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
  const lastClaim = wallet ? Number(wallet.lastRewardClaim) / 1_000_000 : 0;
  const claimedToday = lastClaim >= new Date().setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-4 px-4 py-4 overflow-y-auto">
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Value",
            val: inr(totalValue),
            color: "text-emerald-700",
          },
          {
            label: "Total Cost",
            val: inr(totalCost),
            color: "text-foreground",
          },
          {
            label: "Gain/Loss",
            val: `${gainLoss >= 0 ? "+" : ""}${inr(Math.abs(gainLoss))}`,
            color: gainColor(gainLoss),
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-card border border-border rounded-xl p-3 text-center"
          >
            <p className={`font-bold text-sm ${c.color}`}>{c.val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      {gainLoss !== 0 && (
        <p
          className={`text-sm font-medium ${gainColor(gainLossPct)} text-center`}
        >
          {gainLossPct >= 0 ? "+" : ""}
          {gainLossPct.toFixed(2)}% overall
        </p>
      )}

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-emerald-700">
              \ud83c\udf81 Daily Reward
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {inr(config?.dailyRewardAmount ?? 10)} \u00b7 Streak:{" "}
              {wallet?.rewardStreak ?? 0} days
            </p>
          </div>
          <button
            type="button"
            onClick={() => claimReward.mutateAsync(userId)}
            disabled={claimedToday || claimReward.isPending}
            className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 hover:bg-emerald-700 transition"
            data-ocid="portfolio.claim_reward_button"
          >
            {claimedToday
              ? "Claimed \u2713"
              : `Claim ${inr(config?.dailyRewardAmount ?? 10)}`}
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Holdings
      </h3>
      {isLoading ? (
        <Spinner />
      ) : holdings.length === 0 ? (
        <div
          className="text-center py-10 text-muted-foreground"
          data-ocid="portfolio.empty_state"
        >
          <p className="text-3xl mb-2">\ud83d\udcc8</p>
          <p className="text-sm">
            Koi holdings nahi \u2014 Market tab se coin kharidein
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-ocid="portfolio.list">
          {holdings.map((h, idx) => {
            const curPrice =
              (prices[h.coinId]?.usd ?? h.averageBuyPrice / 83.5) * 83.5;
            const curValue = h.quantity * curPrice;
            const gl = curValue - h.totalCost;
            const glPct = h.totalCost > 0 ? (gl / h.totalCost) * 100 : 0;
            return (
              <div
                key={h.coinId}
                className={`rounded-xl border p-3 ${gl >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
                data-ocid={`portfolio.item.${idx + 1}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {h.coinName}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({h.symbol})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {fmt(h.quantity)} \u00b7 Avg:{" "}
                      {inr(h.averageBuyPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{inr(curValue)}</p>
                    <p className={`text-xs font-medium ${gainColor(glPct)}`}>
                      {gl >= 0 ? "+" : ""}
                      {inr(Math.abs(gl))} ({glPct.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── WALLET TAB ───────────────────────────────────────────────────────────────

function WalletTab({
  userId,
  email,
  config,
}: {
  userId: string;
  email: string;
  config: { minWithdrawal: number; maxWithdrawal: number } | null;
}) {
  const { data: wallet } = useUserCryptoWallet(userId);
  const { data: txns = [] } = useUserCryptoTransactions(userId);
  const { data: withdrawals = [] } = useUserCryptoWithdrawals(userId);
  const requestDeposit = useRequestDeposit();
  const requestWithdrawal = useRequestCryptoWithdrawal();
  const [depAmt, setDepAmt] = useState("");
  const [withAmt, setWithAmt] = useState("");
  const [withUpi, setWithUpi] = useState("");
  const [withMpin, setWithMpin] = useState("");
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);

  return (
    <div className="flex flex-col overflow-y-auto">
      <div className="mx-4 mt-4 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80 mb-1">Available Balance</p>
        <p className="text-3xl font-bold">{inr(wallet?.balance ?? 0)}</p>
        <div className="flex gap-4 mt-3 text-xs opacity-80">
          <span>Deposited: {inr(wallet?.totalDeposited ?? 0)}</span>
          <span>Withdrawn: {inr(wallet?.totalWithdrawn ?? 0)}</span>
        </div>
      </div>

      <div className="flex gap-3 px-4 mt-4">
        <button
          type="button"
          onClick={() => setShowDepositForm(!showDepositForm)}
          className="flex-1 py-2 rounded-xl border-2 border-emerald-600 text-emerald-700 font-semibold text-sm hover:bg-emerald-50 transition"
          data-ocid="wallet.deposit_button"
        >
          + Deposit
        </button>
        <button
          type="button"
          onClick={() => setShowWithdrawForm(!showWithdrawForm)}
          className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
          data-ocid="wallet.withdraw_button"
        >
          Withdraw
        </button>
      </div>

      {showDepositForm && (
        <div
          className="mx-4 mt-3 p-4 bg-card border border-border rounded-xl"
          data-ocid="wallet.deposit_form"
        >
          <p className="font-semibold text-sm mb-2">Deposit Request</p>
          <p className="text-xs text-muted-foreground mb-2">
            Admin review ke baad amount add hoga
          </p>
          <input
            type="number"
            value={depAmt}
            onChange={(e) => setDepAmt(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm"
            placeholder="Amount (\u20b9)"
            data-ocid="wallet.deposit_amount_input"
          />
          <button
            type="button"
            disabled={requestDeposit.isPending || !depAmt}
            onClick={async () => {
              await requestDeposit.mutateAsync({
                userId,
                amount: Number(depAmt),
              });
              toast.success("Deposit request bheja gaya!");
              setDepAmt("");
              setShowDepositForm(false);
            }}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            data-ocid="wallet.deposit_submit_button"
          >
            Request Submit Karein
          </button>
        </div>
      )}

      {showWithdrawForm && (
        <div
          className="mx-4 mt-3 p-4 bg-card border border-border rounded-xl"
          data-ocid="wallet.withdraw_form"
        >
          <p className="font-semibold text-sm mb-1">Withdrawal Request</p>
          <p className="text-xs text-muted-foreground mb-2">
            Min: {inr(config?.minWithdrawal ?? 100)} \u00b7 Max:{" "}
            {inr(config?.maxWithdrawal ?? 10000)}
          </p>
          <input
            type="number"
            value={withAmt}
            onChange={(e) => setWithAmt(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm"
            placeholder="Amount (\u20b9)"
            data-ocid="wallet.withdraw_amount_input"
          />
          <input
            type="text"
            value={withUpi}
            onChange={(e) => setWithUpi(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm"
            placeholder="UPI ID"
            data-ocid="wallet.withdraw_upi_input"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={withMpin}
            onChange={(e) => setWithMpin(e.target.value.replace(/\D/g, ""))}
            className="w-full border rounded-lg px-3 py-2 mb-3 text-center text-lg tracking-widest"
            placeholder="MPIN"
            data-ocid="wallet.withdraw_mpin_input"
          />
          <button
            type="button"
            disabled={
              requestWithdrawal.isPending ||
              !withAmt ||
              !withUpi ||
              withMpin.length !== 6
            }
            onClick={async () => {
              await requestWithdrawal.mutateAsync({
                userId,
                userEmail: email,
                amount: Number(withAmt),
                upiId: withUpi,
                mpin: withMpin,
              });
              setWithAmt("");
              setWithUpi("");
              setWithMpin("");
              setShowWithdrawForm(false);
            }}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            data-ocid="wallet.withdraw_submit_button"
          >
            Withdrawal Request
          </button>
        </div>
      )}

      <div className="px-4 mt-5">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
          Transactions
        </h3>
        {txns.length === 0 ? (
          <p
            className="text-sm text-muted-foreground py-4 text-center"
            data-ocid="wallet.txns_empty_state"
          >
            Koi transaction nahi
          </p>
        ) : (
          <div className="space-y-2" data-ocid="wallet.txns_list">
            {txns.slice(0, 20).map((t, idx) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-xl"
                data-ocid={`wallet.txn.${idx + 1}`}
              >
                <div>
                  <p className="text-sm font-medium capitalize">
                    {t.type} {t.coinName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.createdAt)} \u00b7 #{t.id.slice(-6)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${t.type === "buy" ? "text-red-500" : "text-emerald-600"}`}
                  >
                    {t.type === "buy" ? "-" : "+"}
                    {inr(Math.abs(t.netAmount))}
                  </p>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-4 mb-6">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
          Withdrawal Requests
        </h3>
        {withdrawals.length === 0 ? (
          <p
            className="text-sm text-muted-foreground py-4 text-center"
            data-ocid="wallet.withdrawals_empty_state"
          >
            Koi withdrawal request nahi
          </p>
        ) : (
          <div className="space-y-2" data-ocid="wallet.withdrawals_list">
            {withdrawals.map((w, idx) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-xl"
                data-ocid={`wallet.withdrawal.${idx + 1}`}
              >
                <div>
                  <p className="text-sm font-medium">{inr(w.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.upiId} \u00b7 {formatDate(w.createdAt)}
                  </p>
                </div>
                <StatusBadge status={w.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUPPORT TAB ──────────────────────────────────────────────────────────────

function TicketThread({
  ticket,
  userId,
}: { ticket: SupportTicket; userId: string }) {
  const { data: replies = [] } = useTicketReplies(ticket.id);
  const replyMutation = useReplyToTicket();
  const [msg, setMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="font-semibold text-sm">{ticket.subject}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {ticket.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={ticket.status} />
            <span className="text-xs text-muted-foreground">
              {formatDate(ticket.createdAt)}
            </span>
          </div>
        </div>
        {replies.map((r, idx) => (
          <div
            key={r.id}
            className={`flex ${r.isAdmin ? "justify-start" : "justify-end"}`}
            data-ocid={`ticket.reply.${idx + 1}`}
          >
            <div
              className={`max-w-xs rounded-xl px-3 py-2 text-sm ${r.isAdmin ? "bg-muted text-foreground" : "bg-emerald-600 text-white"}`}
            >
              <p>{r.message}</p>
              <p className="text-xs opacity-60 mt-1">
                {formatDate(r.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-border">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="Reply karein..."
          data-ocid="ticket.reply_input"
        />
        <button
          type="button"
          disabled={replyMutation.isPending || !msg.trim()}
          onClick={async () => {
            if (!msg.trim()) return;
            await replyMutation.mutateAsync({
              userId,
              ticketId: ticket.id,
              message: msg,
              isAdmin: false,
            });
            setMsg("");
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          data-ocid="ticket.reply_submit_button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function SupportTab({ userId, email }: { userId: string; email: string }) {
  const { data: tickets = [] } = useUserTickets(userId);
  const createTicket = useCreateSupportTicket();
  const [openTicket, setOpenTicket] = useState<SupportTicket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "General",
  });

  const submitTicket = async () => {
    if (!form.subject || !form.description) {
      toast.error("Subject aur description zaroor bharein");
      return;
    }
    await createTicket.mutateAsync({ userId, userEmail: email, ...form });
    setForm({
      subject: "",
      description: "",
      priority: "medium",
      category: "General",
    });
    setShowForm(false);
  };

  if (openTicket) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button
            type="button"
            onClick={() => setOpenTicket(null)}
            className="text-emerald-600 font-medium text-sm"
            data-ocid="ticket.back_button"
          >
            \u2190 Back
          </button>
          <span className="font-semibold text-sm truncate">
            {openTicket.subject}
          </span>
        </div>
        <TicketThread ticket={openTicket} userId={userId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 py-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Support Tickets</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl font-semibold"
          data-ocid="support.new_ticket_button"
        >
          + New Ticket
        </button>
      </div>

      {showForm && (
        <div
          className="bg-card border border-border rounded-xl p-4 mb-4"
          data-ocid="support.new_ticket_form"
        >
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
            placeholder="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            data-ocid="support.subject_input"
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm mb-2 resize-none"
            rows={3}
            placeholder="Apni problem describe karein"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            data-ocid="support.description_textarea"
          />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
              data-ocid="support.priority_select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
              data-ocid="support.category_select"
            >
              <option>Bug Report</option>
              <option>Withdrawal Query</option>
              <option>Coin Inquiry</option>
              <option>General</option>
            </select>
          </div>
          <button
            type="button"
            onClick={submitTicket}
            disabled={createTicket.isPending}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
            data-ocid="support.submit_ticket_button"
          >
            {createTicket.isPending ? "Submitting..." : "Ticket Submit Karein"}
          </button>
        </div>
      )}

      {tickets.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="support.empty_state"
        >
          <p className="text-4xl mb-2">\ud83c\udfab</p>
          <p className="text-sm">Abhi koi ticket nahi</p>
        </div>
      ) : (
        <div className="space-y-2" data-ocid="support.tickets_list">
          {tickets.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenTicket(t)}
              className="w-full text-left p-4 bg-card border border-border rounded-xl hover:bg-muted/40 transition"
              data-ocid={`support.ticket.${idx + 1}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm truncate">{t.subject}</p>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t.category} \u00b7 {formatDate(t.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type Tab = "market" | "portfolio" | "wallet" | "support";

export default function DigitalInvestPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("market");

  const userId = user?.userId ? String(user.userId) : "";
  const email = user?.email ?? "";
  const { data: config, isLoading: configLoading } = useCryptoConfig();
  const { data: wallet } = useUserCryptoWallet(userId);
  const isAdmin = user?.isSuperAdmin || user?.role === "admin";

  if (!configLoading && config && !config.isEnabled && !isAdmin) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-background px-6"
        data-ocid="digitalinvest.page"
      >
        <div className="w-full max-w-sm bg-card border border-emerald-200 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 text-white text-center">
            <p className="text-4xl mb-2">\ud83d\udcc8</p>
            <h1 className="text-2xl font-bold">Digital Invest</h1>
            <p className="text-sm opacity-80 mt-1">Crypto Trading Platform</p>
          </div>
          <div className="p-6 text-center">
            <p className="font-semibold text-foreground">Jaldi Aa Raha Hai!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Yeh feature abhi admin ne band kiya hua hai. Thodi der baad dobara
              check karein.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center">
          <p className="text-3xl mb-3">\ud83d\udd12</p>
          <p className="font-semibold">Pehle login karein</p>
          <p className="text-sm text-muted-foreground mt-1">
            Digital Invest use karne ke liye login zaroor hai
          </p>
          <a
            href="/login"
            className="mt-4 inline-block bg-emerald-600 text-white px-6 py-2 rounded-xl font-semibold"
          >
            Login Karein
          </a>
        </div>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "market", label: "Market", icon: "\ud83d\udcca" },
    { id: "portfolio", label: "Portfolio", icon: "\ud83d\udcbc" },
    { id: "wallet", label: "Wallet", icon: "\ud83d\udcb3" },
    { id: "support", label: "Support", icon: "\ud83c\udfab" },
  ];

  return (
    <div
      className="flex flex-col h-screen bg-background overflow-hidden"
      data-ocid="digitalinvest.page"
    >
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <a href="/" className="text-white/80 text-sm">
            \u2190
          </a>
          <div>
            <h1 className="font-bold text-base leading-tight">
              Digital Invest
            </h1>
            <p className="text-xs opacity-70">Crypto Trading</p>
          </div>
        </div>
        <BalancePill balance={wallet?.balance ?? 0} />
      </div>

      <div className="flex-1 overflow-hidden">
        {configLoading ? (
          <Spinner />
        ) : (
          <div className="h-full overflow-y-auto">
            {activeTab === "market" && (
              <MarketTab
                userId={userId}
                walletBalance={wallet?.balance ?? 0}
                feePercent={config?.tradingFeePercent ?? 0.5}
                hasMpin={wallet?.hasMpin ?? false}
              />
            )}
            {activeTab === "portfolio" && (
              <PortfolioTab userId={userId} config={config ?? null} />
            )}
            {activeTab === "wallet" && (
              <WalletTab
                userId={userId}
                email={email}
                config={config ?? null}
              />
            )}
            {activeTab === "support" && (
              <SupportTab userId={userId} email={email} />
            )}
          </div>
        )}
      </div>

      <div
        className="flex border-t border-border bg-card flex-shrink-0"
        data-ocid="digitalinvest.tab_bar"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition ${
              activeTab === tab.id
                ? "text-emerald-700 border-t-2 border-emerald-600"
                : "text-muted-foreground"
            }`}
            data-ocid={`digitalinvest.${tab.id}_tab`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
