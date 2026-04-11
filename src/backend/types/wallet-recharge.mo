// types/wallet-recharge.mo — Wallet & Recharge domain types
module {

  /// Live wallet balance for a user.
  public type WalletBalance = {
    userId      : Nat;
    balance     : Float;
    lastUpdated : Int;    // Time.now() nanoseconds
  };

  /// A user's request for admin to top-up their wallet.
  public type WalletTopupRequest = {
    id          : Nat;
    userId      : Nat;
    amount      : Float;
    status      : Text;   // "Pending" | "Approved" | "Rejected"
    requestedAt : Int;
    resolvedAt  : ?Int;
    note        : Text;
  };

  /// A single mobile recharge transaction.
  public type RechargeTransaction = {
    id         : Nat;
    userId     : Nat;
    mobile     : Text;
    operator   : Text;
    circle     : Text;
    amount     : Float;
    commission : Float;   // retailer's share earned
    netCost    : Float;   // amount deducted from wallet
    status     : Text;    // "Pending" | "Success" | "Failed" | "Refunded"
    createdAt  : Int;
  };

  /// External recharge API configuration (admin-managed).
  public type RechargeApiConfig = {
    apiUrl            : Text;
    apiKey            : Text;
    responseParam     : Text;
    isActive          : Bool;
    autoRefundEnabled : Bool;   // if true, Failed status triggers automatic refund
  };

  /// Commission configuration.
  public type CommissionConfig = {
    globalCommissionPct  : Float;   // e.g. 5.0  (%) — what admin gets from API
    retailerSharePct     : Float;   // e.g. 2.0  (%) — instant discount for retailer
    adminSharePct        : Float;   // e.g. 3.0  (%) — admin's cut
  };

};
