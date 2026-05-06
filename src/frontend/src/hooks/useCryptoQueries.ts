import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActor } from "./useActor";
import { getAdminToken } from "./useAdminSession";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CryptoConfig {
  isEnabled: boolean;
  tradingFeePercent: number;
  // backward-compat aliases used by CryptoAdminPanel
  buyFeePercent: number;
  sellFeePercent: number;
  isDailyRewardEnabled: boolean;
  highRiskThreshold: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  minDeposit: number;
  dailyRewardAmount: number;
  dailyRewardStreakBonus: number;
}

export interface CryptoCoin {
  id: string;
  name: string;
  symbol: string;
  coinGeckoId: string;
  coingeckoId: string; // backward-compat alias
  logoUrl: string;
  isListed: boolean;
  createdAt: bigint;
}

export interface CryptoWallet {
  userId: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  isFrozen: boolean;
  isBlocked: boolean;
  freezeReason: string;
  blockReason: string;
  mpinHash: string;
  hasMpin: boolean;
  lastRewardClaim: bigint;
  rewardStreak: number;
}

export interface PortfolioHolding {
  coinId: string;
  coinName: string;
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  totalCost: number;
}

export interface CryptoTransaction {
  id: string;
  userId: string;
  type: string;
  coinId: string;
  coinName: string;
  quantity: number;
  priceAtTransaction: number;
  amountInFunds: number;
  fee: number;
  netAmount: number;
  status: string;
  createdAt: bigint;
  note: string;
}

export interface CryptoWithdrawal {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  upiId: string;
  status: string;
  adminNote: string;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  isAdmin: boolean;
  createdAt: bigint;
}

export interface CryptoUserAdmin {
  userId: string;
  email: string;
  wallet: CryptoWallet;
  registeredAt: bigint;
  // backward-compat flat fields (mapped from wallet)
  balance: number;
  totalDeposited: number;
  status: string;
}

export interface CryptoStats {
  totalUsers: number;
  totalAppBalance: number;
  totalCommissionsEarned: number;
  totalCommissions: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalTradingVolume: number;
  pendingWithdrawals: number;
  openTickets: number;
}

export interface DepositRequest {
  id: string;
  userId: string;
  amount: number;
  status: string;
  createdAt: bigint;
}

export type CoinPriceData = { usd: number; usd_24h_change: number };
export type CoinPriceMap = Record<string, CoinPriceData>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Actor = Record<string, (...args: unknown[]) => Promise<unknown>>;

function asActor(actor: unknown): Actor {
  return actor as Actor;
}

function adminToken(): [string] | [] {
  const t = getAdminToken();
  return t ? [t] : [];
}

function optText(v: string | undefined | null): [string] | [] {
  return v ? [v] : [];
}

async function unwrapResult<T>(promise: Promise<unknown>): Promise<T> {
  const res = await promise;
  if (res && typeof res === "object" && "ok" in res)
    return (res as { ok: T }).ok;
  if (res && typeof res === "object" && "err" in res)
    throw new Error(String((res as { err: unknown }).err));
  return res as T;
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────

export function useCryptoConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoConfig | null>({
    queryKey: ["cryptoConfig"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await unwrapResult<CryptoConfig>(
          asActor(actor).getCryptoConfigPublic(),
        );
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
  });
}

// ─── COINS ───────────────────────────────────────────────────────────────────

export function useListedCoins() {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoCoin[]>({
    queryKey: ["listedCoins"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await asActor(actor).getListedCoins()) as CryptoCoin[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 10000,
  });
}

export function useAllCoins() {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoCoin[]>({
    queryKey: ["allCoins"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await asActor(actor).getAllCoins(adminToken())) as CryptoCoin[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 10000,
  });
}

export function useAddCoin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      symbol,
      coinGeckoId,
      logoUrl,
    }: {
      name: string;
      symbol: string;
      coinGeckoId: string;
      logoUrl: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).addCoin(
          adminToken(),
          name,
          symbol,
          coinGeckoId,
          logoUrl,
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allCoins"] });
      qc.invalidateQueries({ queryKey: ["listedCoins"] });
    },
    onError: (e) => toast.error(`Coin add nahi hua: ${(e as Error).message}`),
  });
}

export function useUpdateCoin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isListed }: { id: string; isListed: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).updateCoin(adminToken(), id, isListed),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allCoins"] });
      qc.invalidateQueries({ queryKey: ["listedCoins"] });
    },
    onError: (e) =>
      toast.error(`Coin update nahi hua: ${(e as Error).message}`),
  });
}

export function useDeleteCoin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(asActor(actor).deleteCoin(adminToken(), id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allCoins"] });
      qc.invalidateQueries({ queryKey: ["listedCoins"] });
    },
    onError: (e) =>
      toast.error(`Coin delete nahi hua: ${(e as Error).message}`),
  });
}

// ─── WALLET ──────────────────────────────────────────────────────────────────

export function useUserCryptoWallet(userId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoWallet | null>({
    queryKey: ["cryptoWallet", userId],
    queryFn: async () => {
      if (!actor || !userId) return null;
      try {
        return await unwrapResult<CryptoWallet>(
          asActor(actor).getUserCryptoWallet(userId),
        );
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!userId,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

export function useSetMpin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, mpin }: { userId: string; mpin: string }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(asActor(actor).setMpin(userId, mpin));
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["cryptoWallet", v.userId] }),
    onError: (e) => toast.error(`MPIN set nahi hua: ${(e as Error).message}`),
  });
}

export function useChangeMpin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      currentMpin,
      newMpin,
    }: { userId: string; currentMpin: string; newMpin: string }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).changeMpin(userId, currentMpin, newMpin),
      );
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["cryptoWallet", v.userId] }),
    onError: (e) =>
      toast.error(`MPIN change nahi hua: ${(e as Error).message}`),
  });
}

export function useAdminResetMpin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(asActor(actor).adminResetMpin(adminToken(), userId));
    },
    onSuccess: (_d, userId) =>
      qc.invalidateQueries({ queryKey: ["cryptoWallet", userId] }),
    onError: (e) => toast.error(`MPIN reset nahi hua: ${(e as Error).message}`),
  });
}

export function useRequestDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      amount,
    }: { userId: string; amount: number }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(asActor(actor).requestDeposit(userId, amount));
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["cryptoWallet", v.userId] });
      qc.invalidateQueries({ queryKey: ["depositRequests", v.userId] });
    },
    onError: (e) =>
      toast.error(`Deposit request fail: ${(e as Error).message}`),
  });
}

export function useAdminApproveDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (txId: string) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).adminApproveDeposit(adminToken(), txId),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cryptoStats"] }),
    onError: (e) =>
      toast.error(`Deposit approve nahi hua: ${(e as Error).message}`),
  });
}

// ─── TRADING ─────────────────────────────────────────────────────────────────

export function useBuyCoin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      coinId,
      amountInFunds,
      currentPrice,
      mpin,
    }: {
      userId: string;
      coinId: string;
      amountInFunds: number;
      currentPrice: number;
      mpin: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).buyCoin(
          userId,
          coinId,
          amountInFunds,
          currentPrice,
          mpin,
        ),
      );
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["cryptoWallet", v.userId] });
      qc.invalidateQueries({ queryKey: ["portfolio", v.userId] });
      qc.invalidateQueries({ queryKey: ["cryptoTxns", v.userId] });
    },
    onError: (e) => toast.error(`Buy fail: ${(e as Error).message}`),
  });
}

export function useSellCoin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      coinId,
      quantity,
      currentPrice,
      mpin,
    }: {
      userId: string;
      coinId: string;
      quantity: number;
      currentPrice: number;
      mpin: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).sellCoin(userId, coinId, quantity, currentPrice, mpin),
      );
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["cryptoWallet", v.userId] });
      qc.invalidateQueries({ queryKey: ["portfolio", v.userId] });
      qc.invalidateQueries({ queryKey: ["cryptoTxns", v.userId] });
    },
    onError: (e) => toast.error(`Sell fail: ${(e as Error).message}`),
  });
}

export function useUserPortfolio(userId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<PortfolioHolding[]>({
    queryKey: ["portfolio", userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      try {
        return (await asActor(actor).getUserPortfolio(
          userId,
        )) as PortfolioHolding[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!userId,
    staleTime: 5000,
    refetchInterval: 30000,
  });
}

export function useUserCryptoTransactions(userId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoTransaction[]>({
    queryKey: ["cryptoTxns", userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      try {
        return (await asActor(actor).getUserCryptoTransactions(
          userId,
        )) as CryptoTransaction[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!userId,
    staleTime: 10000,
  });
}

// ─── WITHDRAWALS ─────────────────────────────────────────────────────────────

export function useRequestCryptoWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      userEmail,
      amount,
      upiId,
      mpin,
    }: {
      userId: string;
      userEmail: string;
      amount: number;
      upiId: string;
      mpin: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).requestCryptoWithdrawal(
          userId,
          userEmail,
          amount,
          upiId,
          mpin,
        ),
      );
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["cryptoWallet", v.userId] });
      qc.invalidateQueries({ queryKey: ["userWithdrawals", v.userId] });
    },
    onError: (e) =>
      toast.error(`Withdrawal request fail: ${(e as Error).message}`),
  });
}

export function useAdminApproveCryptoWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      withdrawalId,
      adminNote,
    }: { withdrawalId: string; adminNote?: string }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).adminApproveCryptoWithdrawal(
          adminToken(),
          withdrawalId,
          optText(adminNote),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminWithdrawals"] }),
    onError: (e) =>
      toast.error(`Withdrawal approve nahi hua: ${(e as Error).message}`),
  });
}

export function useAdminRejectCryptoWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      withdrawalId,
      adminNote,
    }: { withdrawalId: string; adminNote?: string }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).adminRejectCryptoWithdrawal(
          adminToken(),
          withdrawalId,
          optText(adminNote),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminWithdrawals"] }),
    onError: (e) =>
      toast.error(`Withdrawal reject nahi hua: ${(e as Error).message}`),
  });
}

export function useUserCryptoWithdrawals(userId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoWithdrawal[]>({
    queryKey: ["userWithdrawals", userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      try {
        return (await asActor(actor).getUserCryptoWithdrawals(
          userId,
        )) as CryptoWithdrawal[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!userId,
    staleTime: 10000,
  });
}

export function useAdminGetAllWithdrawals() {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoWithdrawal[]>({
    queryKey: ["adminWithdrawals"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await unwrapResult<CryptoWithdrawal[]>(
          asActor(actor).adminGetAllWithdrawals(adminToken()),
        );
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 10000,
  });
}

// ─── DAILY REWARD ────────────────────────────────────────────────────────────

export function useClaimDailyReward() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(asActor(actor).claimDailyReward(userId));
    },
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ["cryptoWallet", userId] });
      toast.success("Daily reward claim ho gaya!");
    },
    onError: (e) =>
      toast.error(`Reward claim nahi hua: ${(e as Error).message}`),
  });
}

// ─── USER MANAGEMENT (Admin) ─────────────────────────────────────────────────

export function useFreezeCryptoUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      isFrozen,
      reason,
    }: { userId: string; isFrozen: boolean; reason: string }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).freezeCryptoUser(adminToken(), userId, isFrozen, reason),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allCryptoUsers"] }),
    onError: (e) =>
      toast.error(`User freeze nahi hua: ${(e as Error).message}`),
  });
}

export function useBlockCryptoUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      isBlocked,
      reason,
    }: { userId: string; isBlocked: boolean; reason: string }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).blockCryptoUser(adminToken(), userId, isBlocked, reason),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allCryptoUsers"] }),
    onError: (e) => toast.error(`User block nahi hua: ${(e as Error).message}`),
  });
}

export function useAdminGetAllCryptoUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoUserAdmin[]>({
    queryKey: ["allCryptoUsers"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await unwrapResult<CryptoUserAdmin[]>(
          asActor(actor).adminGetAllCryptoUsers(adminToken()),
        );
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 15000,
  });
}

export function useAdminGetCryptoStats() {
  const { actor, isFetching } = useActor();
  return useQuery<CryptoStats | null>({
    queryKey: ["cryptoStats"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await unwrapResult<CryptoStats>(
          asActor(actor).adminGetCryptoStats(adminToken()),
        );
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 15000,
  });
}

// ─── SUPPORT TICKETS ─────────────────────────────────────────────────────────

export function useCreateSupportTicket() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      userEmail,
      subject,
      description,
      priority,
      category,
    }: {
      userId: string;
      userEmail: string;
      subject: string;
      description: string;
      priority: string;
      category: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).createSupportTicket(
          userId,
          userEmail,
          subject,
          description,
          priority,
          category,
        ),
      );
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["userTickets", v.userId] });
      toast.success("Ticket submit ho gaya!");
    },
    onError: (e) =>
      toast.error(`Ticket create nahi hua: ${(e as Error).message}`),
  });
}

export function useUserTickets(userId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<SupportTicket[]>({
    queryKey: ["userTickets", userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      try {
        return (await asActor(actor).getUserTickets(userId)) as SupportTicket[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!userId,
    staleTime: 10000,
  });
}

export function useTicketReplies(ticketId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<TicketReply[]>({
    queryKey: ["ticketReplies", ticketId],
    queryFn: async () => {
      if (!actor || !ticketId) return [];
      try {
        return (await asActor(actor).getTicketReplies(
          ticketId,
        )) as TicketReply[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!ticketId,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

export function useReplyToTicket() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      ticketId,
      message,
      isAdmin,
    }: {
      userId: string;
      ticketId: string;
      message: string;
      isAdmin: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const token: [string] | [] = isAdmin ? adminToken() : [];
      return unwrapResult(
        asActor(actor).replyToTicket(userId, ticketId, message, isAdmin, token),
      );
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ticketReplies", v.ticketId] });
      qc.invalidateQueries({ queryKey: ["userTickets", v.userId] });
    },
    onError: (e) => toast.error(`Reply nahi gayi: ${(e as Error).message}`),
  });
}

export function useUpdateTicketStatus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      status,
    }: { ticketId: string; status: string }) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).updateTicketStatus(adminToken(), ticketId, status),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminTickets"] }),
    onError: (e) =>
      toast.error(`Status update nahi hua: ${(e as Error).message}`),
  });
}

export function useAdminGetAllTickets() {
  const { actor, isFetching } = useActor();
  return useQuery<SupportTicket[]>({
    queryKey: ["adminTickets"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await unwrapResult<SupportTicket[]>(
          asActor(actor).adminGetAllTickets(adminToken()),
        );
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 10000,
  });
}

// ─── Compatibility aliases for CryptoAdminPanel ───────────────────────────

export const useAdminGetCryptoWithdrawals = useAdminGetAllWithdrawals;
export const useAdminGetTickets = useAdminGetAllTickets;

export function useToggleCoinListing() {
  return useUpdateCoin();
}

export function useUpdateCryptoConfig() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<CryptoConfig>) => {
      if (!actor) throw new Error("Actor not available");
      return unwrapResult(
        asActor(actor).updateCryptoConfig(adminToken(), JSON.stringify(config)),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cryptoConfig"] }),
    onError: (e) =>
      toast.error(`Config update nahi hua: ${(e as Error).message}`),
  });
}

// ─── COINGECKO LIVE PRICES ───────────────────────────────────────────────────

export async function fetchCoinGeckoPrices(
  coinGeckoIds: string[],
): Promise<CoinPriceMap> {
  if (!coinGeckoIds.length) return {};
  try {
    const ids = coinGeckoIds.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    if (!res.ok) return {};
    return (await res.json()) as CoinPriceMap;
  } catch {
    return {};
  }
}

export function useLiveCoinPrices(coinGeckoIds: string[]) {
  return useQuery<CoinPriceMap>({
    queryKey: ["coin-prices", coinGeckoIds],
    queryFn: () => fetchCoinGeckoPrices(coinGeckoIds),
    enabled: coinGeckoIds.length > 0,
    refetchInterval: 60000,
    staleTime: 55000,
  });
}
