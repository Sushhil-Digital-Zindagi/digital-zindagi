// lib/offer-portal.mo — Offer Portal pure helper functions
import Types  "../types/offer-portal";
import Map    "mo:core/Map";
import Time   "mo:core/Time";
import Nat    "mo:core/Nat";
import Text   "mo:core/Text";
import Int    "mo:core/Int";
import Runtime "mo:core/Runtime";

module {

  public type OfferUser        = Types.OfferUser;
  public type OfferTransaction = Types.OfferTransaction;
  public type OfferWithdrawal  = Types.OfferWithdrawal;
  public type OfferPortalConfig = Types.OfferPortalConfig;
  public type RechargeReceipt  = Types.RechargeReceipt;

  // ── User helpers ─────────────────────────────────────────────────────────

  /// Create a new OfferUser record.
  /// passwordHash is stored as-is (future: apply cryptographic hash).
  public func createOfferUser(
    id           : Nat,
    email        : Text,
    passwordHash : Text,
    referredBy   : ?Text,
  ) : OfferUser {
    {
      id;
      userId          = "offer_user_" # id.toText();
      email;
      passwordHash;
      referralCode    = generateReferralCode(id);
      referredBy;
      totalEarnings   = 0;
      pendingEarnings = 0;
      tier1Earnings   = 0;
      tier2Earnings   = 0;
      tier3Earnings   = 0;
      tier4Earnings   = 0;
      tier5Earnings   = 0;
      createdAt       = Time.now();
    };
  };

  /// Generate a unique referral code for an offer user.
  /// Uses id + timestamp base to ensure uniqueness.
  public func generateReferralCode(id : Nat) : Text {
    "DZ" # id.toText() # Int.abs(Time.now()).toText().size().toText();
  };

  /// Calculate 60/40 (or configurable) profit split.
  /// Returns (userShare, adminShare) in the same unit as totalAmount.
  /// Guards: totalAmount=0 → (0,0); userPct capped at [0,100].
  public func calculateProfitSplit(
    totalAmount : Nat,
    userPct     : Nat,
  ) : (userShare : Nat, adminShare : Nat) {
    if (totalAmount == 0) { return (0, 0) };
    // Cap userPct to the valid range [0, 100]
    let safePct : Nat = if (userPct > 100) { 100 } else { userPct };
    let userShare  = (totalAmount * safePct) / 100;
    let adminShare = totalAmount - userShare;
    (userShare, adminShare);
  };

  /// Create a new OfferTransaction record.
  public func createOfferTransaction(
    id          : Nat,
    offerUserId : Nat,
    txType      : { #cpalead; #referralBonus; #manualCredit },
    amount      : Nat,
    description : Text,
  ) : OfferTransaction {
    {
      id;
      offerUserId;
      txType;
      amount;
      description;
      createdAt = Time.now();
      status    = #credited;
    };
  };

  /// Create a new pending OfferWithdrawal request.
  public func createOfferWithdrawal(
    id          : Nat,
    offerUserId : Nat,
    upiId       : Text,
    amount      : Nat,
  ) : OfferWithdrawal {
    {
      id;
      offerUserId;
      upiId;
      amount;
      status      = #pending;
      requestedAt = Time.now();
      processedAt = null;
      adminNote   = null;
    };
  };

  // ── Lookup helpers ────────────────────────────────────────────────────────

  /// Find an offer user by email.
  public func findByEmail(
    offerUsers : Map.Map<Nat, OfferUser>,
    email      : Text,
  ) : ?OfferUser {
    offerUsers.values().find(func(u : OfferUser) : Bool { u.email == email });
  };

  /// Find an offer user by referral code.
  public func findByReferralCode(
    offerUsers   : Map.Map<Nat, OfferUser>,
    referralCode : Text,
  ) : ?OfferUser {
    offerUsers.values().find(func(u : OfferUser) : Bool { u.referralCode == referralCode });
  };

  /// Return all transactions for a given offerUserId.
  public func listTransactionsByUser(
    offerTxns   : Map.Map<Nat, OfferTransaction>,
    offerUserId : Nat,
  ) : [OfferTransaction] {
    offerTxns.values()
      .filter(func(t : OfferTransaction) : Bool { t.offerUserId == offerUserId })
      .toArray();
  };

  /// Return all withdrawal requests for a given offerUserId.
  public func listWithdrawalsByUser(
    withdrawals : Map.Map<Nat, OfferWithdrawal>,
    offerUserId : Nat,
  ) : [OfferWithdrawal] {
    withdrawals.values()
      .filter(func(w : OfferWithdrawal) : Bool { w.offerUserId == offerUserId })
      .toArray();
  };

  // ── Default config ────────────────────────────────────────────────────────

  public func defaultOfferPortalConfig() : OfferPortalConfig {
    {
      isEnabled            = false;
      cpaLeadWebhookSecret = "";
      cpagripApiKey        = "";
      adminProfitPct       = 60;
      userProfitPct        = 40;
    };
  };

};
