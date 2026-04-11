// mixins/wallet-recharge-api.mo — Wallet & Recharge public API helpers
//
// Security model:
//   - userId is ALWAYS derived from principalToUserId map — never user-supplied.
//   - isAdmin checks gate every admin-only operation.
//   - Wallet deduction returns a sentinel (-1.0) rather than trapping so the
//     caller can produce a user-friendly error message.
//
import Types      "../types/wallet-recharge";
import WRLib      "../lib/wallet-recharge";
import Map        "mo:core/Map";
import Time       "mo:core/Time";
import Principal  "mo:core/Principal";

module {

  public type WalletBalance       = Types.WalletBalance;
  public type WalletTopupRequest  = Types.WalletTopupRequest;
  public type RechargeTransaction = Types.RechargeTransaction;
  public type RechargeApiConfig   = Types.RechargeApiConfig;
  public type CommissionConfig    = Types.CommissionConfig;

  // ── Wallet balance ─────────────────────────────────────────────────────────

  /// Get wallet balance for caller's userId.
  public func getMyBalance(
    walletBalances     : Map.Map<Nat, WalletBalance>,
    principalToUserId  : Map.Map<Principal, Nat>,
    caller             : Principal,
  ) : Float {
    switch (principalToUserId.get(caller)) {
      case null    { 0.0 };
      case (?uid)  { WRLib.getBalance(walletBalances, uid) };
    };
  };

  /// Get wallet balance for an explicit userId (admin only — caller already verified).
  public func getBalanceByUserId(
    walletBalances : Map.Map<Nat, WalletBalance>,
    userId         : Nat,
  ) : Float {
    WRLib.getBalance(walletBalances, userId);
  };

  /// Return all (userId, balance) pairs (admin only — caller already verified).
  public func getAllBalances(
    walletBalances : Map.Map<Nat, WalletBalance>,
  ) : [(Nat, Float)] {
    walletBalances.entries()
      .map<(Nat, WalletBalance), (Nat, Float)>(func(kv) { (kv.0, kv.1.balance) })
      .toArray();
  };

  /// Admin: directly add or deduct balance.
  /// isAdd = true  → credit;  isAdd = false → debit.
  /// Returns true on success, false if debit would go negative.
  public func adminAdjust(
    walletBalances : Map.Map<Nat, WalletBalance>,
    userId         : Nat,
    amount         : Float,
    isAdd          : Bool,
  ) : Bool {
    let delta  = if isAdd { amount } else { -amount };
    let result = WRLib.adjustBalance(walletBalances, userId, delta, false);
    result >= 0.0;
  };

  // ── Topup requests ─────────────────────────────────────────────────────────

  /// Create a pending topup request for caller. Returns new request ID.
  /// Caller must pass the current nextId value; the returned #ok contains the used ID.
  /// Caller is responsible for incrementing their own counter after a successful call.
  public func requestTopup(
    topupRequests     : Map.Map<Nat, WalletTopupRequest>,
    nextId            : Nat,
    principalToUserId : Map.Map<Principal, Nat>,
    caller            : Principal,
    amount            : Float,
    note              : Text,
  ) : { #ok : Nat; #err : Text } {
    switch (principalToUserId.get(caller)) {
      case null    { #err("User not registered") };
      case (?uid)  {
        let req = WRLib.newTopupRequest(nextId, uid, amount, note);
        topupRequests.add(nextId, req);
        #ok(nextId);
      };
    };
  };

  /// Return all topup requests for caller.
  public func getMyTopupRequests(
    topupRequests     : Map.Map<Nat, WalletTopupRequest>,
    principalToUserId : Map.Map<Principal, Nat>,
    caller            : Principal,
  ) : [WalletTopupRequest] {
    switch (principalToUserId.get(caller)) {
      case null    { [] };
      case (?uid)  { WRLib.listTopupRequestsByUser(topupRequests, uid) };
    };
  };

  /// Admin: return all topup requests.
  public func getAllTopupRequests(
    topupRequests : Map.Map<Nat, WalletTopupRequest>,
  ) : [WalletTopupRequest] {
    topupRequests.values().toArray();
  };

  /// Admin: approve or reject a topup request.
  /// On approval adds funds to the user's wallet.
  /// Returns true on success, false if request not found or already resolved.
  public func resolveTopupRequest(
    topupRequests  : Map.Map<Nat, WalletTopupRequest>,
    walletBalances : Map.Map<Nat, WalletBalance>,
    requestId      : Nat,
    approve        : Bool,
  ) : Bool {
    switch (topupRequests.get(requestId)) {
      case null    { false };
      case (?req)  {
        if (req.status != "Pending") { return false };
        let newStatus = if approve { "Approved" } else { "Rejected" };
        topupRequests.add(requestId, { req with
          status     = newStatus;
          resolvedAt = ?Time.now();
        });
        if (approve) {
          ignore WRLib.adjustBalance(walletBalances, req.userId, req.amount, true);
        };
        true;
      };
    };
  };

  // ── Recharge transactions ──────────────────────────────────────────────────

  /// Initiate a recharge for caller.
  /// Deducts netCost from wallet.  Returns #ok(txId) or #err(reason).
  /// Caller must pass the current nextId value and increment their own counter after success.
  public func initiateRecharge(
    rechargeTxns      : Map.Map<Nat, RechargeTransaction>,
    walletBalances    : Map.Map<Nat, WalletBalance>,
    nextId            : Nat,
    principalToUserId : Map.Map<Principal, Nat>,
    commissionCfg     : CommissionConfig,
    rechargeEnabled   : Bool,
    caller            : Principal,
    mobile            : Text,
    operator          : Text,
    circle            : Text,
    amount            : Float,
  ) : { #ok : Nat; #err : Text } {
    if (not rechargeEnabled) {
      return #err("Recharge service is currently disabled");
    };
    switch (principalToUserId.get(caller)) {
      case null    { #err("User not registered") };
      case (?uid)  {
        let (commission, netCost) = WRLib.calcCommission(amount, commissionCfg);
        let result = WRLib.adjustBalance(walletBalances, uid, -netCost, false);
        if (result < 0.0) {
          return #err("Insufficient wallet balance");
        };
        let txn = WRLib.newRechargeTransaction(nextId, uid, mobile, operator, circle, amount, commission, netCost);
        rechargeTxns.add(nextId, txn);
        #ok(nextId);
      };
    };
  };

  /// Admin: update the status of a recharge transaction.
  /// If status = "Failed" and the previous status was "Pending",
  /// a refund is NOT automatic here — use refundRecharge for that.
  public func updateRechargeStatus(
    rechargeTxns : Map.Map<Nat, RechargeTransaction>,
    txId         : Nat,
    status       : Text,
  ) : Bool {
    switch (rechargeTxns.get(txId)) {
      case null    { false };
      case (?txn)  {
        rechargeTxns.add(txId, { txn with status });
        true;
      };
    };
  };

  /// Admin: refund a Failed recharge — restore netCost to the user's wallet.
  public func refundRecharge(
    rechargeTxns   : Map.Map<Nat, RechargeTransaction>,
    walletBalances : Map.Map<Nat, WalletBalance>,
    txId           : Nat,
  ) : Bool {
    switch (rechargeTxns.get(txId)) {
      case null    { false };
      case (?txn)  {
        if (txn.status != "Failed") { return false };
        ignore WRLib.adjustBalance(walletBalances, txn.userId, txn.netCost, true);
        rechargeTxns.add(txId, { txn with status = "Refunded" });
        true;
      };
    };
  };

  /// Return all recharge transactions for caller.
  public func getMyRechargeHistory(
    rechargeTxns      : Map.Map<Nat, RechargeTransaction>,
    principalToUserId : Map.Map<Principal, Nat>,
    caller            : Principal,
  ) : [RechargeTransaction] {
    switch (principalToUserId.get(caller)) {
      case null    { [] };
      case (?uid)  { WRLib.listRechargeByUser(rechargeTxns, uid) };
    };
  };

  /// Admin: return all recharge transactions.
  public func getAllRechargeTransactions(
    rechargeTxns : Map.Map<Nat, RechargeTransaction>,
  ) : [RechargeTransaction] {
    rechargeTxns.values().toArray();
  };

};
