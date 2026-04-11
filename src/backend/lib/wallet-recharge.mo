// lib/wallet-recharge.mo — Wallet & Recharge domain logic (stateless helpers)
import Types "../types/wallet-recharge";
import Map   "mo:core/Map";
import Time  "mo:core/Time";
import Float "mo:core/Float";

module {

  public type WalletBalance       = Types.WalletBalance;
  public type WalletTopupRequest  = Types.WalletTopupRequest;
  public type RechargeTransaction = Types.RechargeTransaction;
  public type RechargeApiConfig   = Types.RechargeApiConfig;
  public type CommissionConfig    = Types.CommissionConfig;

  // ── Wallet helpers ─────────────────────────────────────────────────────────

  /// Return the current balance for userId; 0.0 if no wallet exists yet.
  public func getBalance(
    walletBalances : Map.Map<Nat, WalletBalance>,
    userId         : Nat,
  ) : Float {
    switch (walletBalances.get(userId)) {
      case null    { 0.0 };
      case (?wb)   { wb.balance };
    };
  };

  /// Set (or create) the wallet balance for userId.
  public func setBalance(
    walletBalances : Map.Map<Nat, WalletBalance>,
    userId         : Nat,
    newBalance     : Float,
  ) {
    walletBalances.add(userId, {
      userId;
      balance     = newBalance;
      lastUpdated = Time.now();
    });
  };

  /// Add delta to wallet (positive = credit, negative = debit).
  /// Returns the new balance.  Traps if the result would go negative.
  public func adjustBalance(
    walletBalances : Map.Map<Nat, WalletBalance>,
    userId         : Nat,
    delta          : Float,
    allowNegative  : Bool,   // pass false for normal deductions
  ) : Float {
    let current  = getBalance(walletBalances, userId);
    let newBal   = current + delta;
    if (not allowNegative and newBal < 0.0) {
      return -1.0;  // sentinel for "insufficient balance"
    };
    setBalance(walletBalances, userId, newBal);
    newBal;
  };

  // ── Topup request helpers ──────────────────────────────────────────────────

  /// Create a new pending topup request.
  public func newTopupRequest(
    id     : Nat,
    userId : Nat,
    amount : Float,
    note   : Text,
  ) : WalletTopupRequest {
    { id; userId; amount; status = "Pending"; requestedAt = Time.now(); resolvedAt = null; note };
  };

  /// Return all topup requests for a specific userId.
  public func listTopupRequestsByUser(
    topupRequests : Map.Map<Nat, WalletTopupRequest>,
    userId        : Nat,
  ) : [WalletTopupRequest] {
    topupRequests.values()
      .filter(func(r : WalletTopupRequest) : Bool { r.userId == userId })
      .toArray();
  };

  // ── Recharge helpers ───────────────────────────────────────────────────────

  /// Calculate commission and net cost from the commission config.
  /// commission = amount * (retailerSharePct / 100)
  /// netCost    = amount - commission
  public func calcCommission(
    amount : Float,
    cfg    : CommissionConfig,
  ) : (commission : Float, netCost : Float) {
    let commission = amount * (cfg.retailerSharePct / 100.0);
    let netCost    = amount - commission;
    (commission, netCost);
  };

  /// Create a new recharge transaction record in "Pending" status.
  public func newRechargeTransaction(
    id         : Nat,
    userId     : Nat,
    mobile     : Text,
    operator   : Text,
    circle     : Text,
    amount     : Float,
    commission : Float,
    netCost    : Float,
  ) : RechargeTransaction {
    { id; userId; mobile; operator; circle; amount; commission; netCost;
      status = "Pending"; createdAt = Time.now() };
  };

  /// Return all recharge transactions for a specific userId.
  public func listRechargeByUser(
    rechargeTxns : Map.Map<Nat, RechargeTransaction>,
    userId       : Nat,
  ) : [RechargeTransaction] {
    rechargeTxns.values()
      .filter(func(t : RechargeTransaction) : Bool { t.userId == userId })
      .toArray();
  };

  // ── Default configs ────────────────────────────────────────────────────────

  public func defaultApiConfig() : RechargeApiConfig {
    { apiUrl = ""; apiKey = ""; responseParam = "status"; isActive = false; autoRefundEnabled = false };
  };

  public func defaultCommissionConfig() : CommissionConfig {
    { globalCommissionPct = 5.0; retailerSharePct = 2.0; adminSharePct = 3.0 };
  };

};
