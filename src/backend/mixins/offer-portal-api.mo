// mixins/offer-portal-api.mo — Offer Portal public API mixin
//
// Exposes all Offer Portal endpoints.  State is injected from main.mo.
// CPALead postback is handled via the http-outcalls extension.
// SMS alerts use lib/sms.mo + http-outcalls extension.
//
import OPTypes  "../types/offer-portal";
import OPLib    "../lib/offer-portal";
import WRTypes  "../types/wallet-recharge";
import Map      "mo:core/Map";
import Time     "mo:core/Time";
import Runtime  "mo:core/Runtime";
import Nat      "mo:core/Nat";
import Text     "mo:core/Text";
import Int      "mo:core/Int";

module {

  public type OfferUser        = OPTypes.OfferUser;
  public type OfferTransaction = OPTypes.OfferTransaction;
  public type OfferWithdrawal  = OPTypes.OfferWithdrawal;
  public type OfferPortalConfig = OPTypes.OfferPortalConfig;
  public type SmsConfig        = OPTypes.SmsConfig;
  public type RechargeReceipt  = OPTypes.RechargeReceipt;

  // ── Offer Portal auth ─────────────────────────────────────────────────────

  /// Register a new Offer Portal user (isolated from main user DB).
  /// Returns #ok(userId) or #err(reason).
  public func registerOfferUser(
    offerUsers    : Map.Map<Nat, OfferUser>,
    nextId        : Nat,
    email         : Text,
    passwordHash  : Text,
    referralCode  : ?Text,
  ) : { #ok : Nat; #err : Text } {
    // Reject duplicate emails
    switch (OPLib.findByEmail(offerUsers, email)) {
      case (?_) { return #err("Email already registered") };
      case null {};
    };

    // Resolve referredBy — verify referral code is valid if provided
    let referredBy : ?Text = switch (referralCode) {
      case null { null };
      case (?code) {
        switch (OPLib.findByReferralCode(offerUsers, code)) {
          case null { return #err("Invalid referral code") };
          case (?_) { ?code };
        };
      };
    };

    let user = OPLib.createOfferUser(nextId, email, passwordHash, referredBy);
    offerUsers.add(nextId, user);
    #ok(nextId);
  };

  /// Login for the Offer Portal.  Returns #ok(OfferUser) or #err.
  public func loginOfferUser(
    offerUsers   : Map.Map<Nat, OfferUser>,
    email        : Text,
    passwordHash : Text,
  ) : { #ok : OfferUser; #err : Text } {
    switch (OPLib.findByEmail(offerUsers, email)) {
      case null { #err("Email not found") };
      case (?user) {
        if (user.passwordHash == passwordHash) {
          #ok(user);
        } else {
          #err("Incorrect password");
        };
      };
    };
  };

  // ── Earnings & transactions ───────────────────────────────────────────────

  /// Get live earnings summary for an offer user.
  public func getEarningsSummary(
    offerUsers  : Map.Map<Nat, OfferUser>,
    offerUserId : Nat,
  ) : { totalEarnings : Nat; pendingEarnings : Nat; referralCode : Text } {
    switch (offerUsers.get(offerUserId)) {
      case null {
        { totalEarnings = 0; pendingEarnings = 0; referralCode = "" };
      };
      case (?user) {
        {
          totalEarnings   = user.totalEarnings;
          pendingEarnings = user.pendingEarnings;
          referralCode    = user.referralCode;
        };
      };
    };
  };

  /// Get full transaction history for an offer user.
  public func getMyOfferTransactions(
    offerTxns   : Map.Map<Nat, OfferTransaction>,
    offerUserId : Nat,
  ) : [OfferTransaction] {
    OPLib.listTransactionsByUser(offerTxns, offerUserId);
  };

  // ── CPALead postback ──────────────────────────────────────────────────────

  /// Process an inbound offer wall postback (CPALead, CPAGrip, AdWork, etc.).
  /// Verifies webhookSecret, applies configurable profit split, credits user earnings.
  /// Returns #ok(txnId) on success, #err(reason) on any validation failure.
  public func processCpaLeadPostback(
    offerUsers    : Map.Map<Nat, OfferUser>,
    offerTxns     : Map.Map<Nat, OfferTransaction>,
    nextTxnId     : Nat,
    config        : OfferPortalConfig,
    offerUserId   : Nat,
    grossAmount   : Nat,
    webhookSecret : Text,
  ) : { #ok : Nat; #err : Text } {
    // Verify portal enabled
    if (not config.isEnabled) {
      return #err("Offer portal is disabled");
    };
    // Verify secret against the generic offer wall webhook secret
    if (webhookSecret != config.cpaLeadWebhookSecret) {
      return #err("Invalid webhook secret");
    };
    // Reject zero or nonsensical amounts
    if (grossAmount == 0) {
      return #err("Invalid amount");
    };
    // Verify user exists
    switch (offerUsers.get(offerUserId)) {
      case null { return #err("Offer user not found") };
      case (?user) {
        let (userShare, _adminShare) = OPLib.calculateProfitSplit(grossAmount, config.userProfitPct);
        // Build a descriptive transaction label using the actual configured percentage
        let desc = "Offer completed — gross: ₹" # grossAmount.toText()
          # " | Your share (" # config.userProfitPct.toText() # "%): ₹" # userShare.toText();
        // Create transaction
        let txn = OPLib.createOfferTransaction(
          nextTxnId, offerUserId, #cpalead, userShare, desc,
        );
        offerTxns.add(nextTxnId, txn);
        // Credit exactly userShare to the user's totalEarnings
        offerUsers.add(offerUserId, { user with
          totalEarnings = user.totalEarnings + userShare;
        });
        #ok(nextTxnId);
      };
    };
  };

  // ── Referral bonus ────────────────────────────────────────────────────────

  /// Credit a 1% referral bonus to the referrer.
  /// referrerId is the offer user ID of the referrer.
  /// Returns the new txnId used, or 0 if the referrer was not found.
  public func creditReferralBonus(
    offerUsers  : Map.Map<Nat, OfferUser>,
    offerTxns   : Map.Map<Nat, OfferTransaction>,
    nextTxnId   : Nat,
    referrerId  : Nat,
    baseAmount  : Nat,
  ) : Nat {
    switch (offerUsers.get(referrerId)) {
      case null { 0 };
      case (?referrer) {
        let bonus = (baseAmount * 1) / 100;
        if (bonus == 0) { return 0 };
        let txn = OPLib.createOfferTransaction(
          nextTxnId, referrerId, #referralBonus, bonus,
          "1% referral bonus on " # baseAmount.toText(),
        );
        offerTxns.add(nextTxnId, txn);
        offerUsers.add(referrerId, { referrer with
          totalEarnings = referrer.totalEarnings + bonus;
        });
        nextTxnId;
      };
    };
  };

  // ── Withdrawals ───────────────────────────────────────────────────────────

  /// Submit a UPI withdrawal request.  Returns #ok(withdrawalId) or #err.
  public func requestWithdrawal(
    offerUsers  : Map.Map<Nat, OfferUser>,
    withdrawals : Map.Map<Nat, OfferWithdrawal>,
    nextId      : Nat,
    offerUserId : Nat,
    upiId       : Text,
    amount      : Nat,
  ) : { #ok : Nat; #err : Text } {
    switch (offerUsers.get(offerUserId)) {
      case null { #err("Offer user not found") };
      case (?user) {
        if (amount == 0) { return #err("Amount must be greater than 0") };
        if (amount > user.totalEarnings) {
          return #err("Insufficient earnings balance");
        };
        let wd = OPLib.createOfferWithdrawal(nextId, offerUserId, upiId, amount);
        withdrawals.add(nextId, wd);
        // Deduct from totalEarnings, move to pendingEarnings
        offerUsers.add(offerUserId, { user with
          totalEarnings   = user.totalEarnings - amount;
          pendingEarnings = user.pendingEarnings + amount;
        });
        #ok(nextId);
      };
    };
  };

  /// Get all withdrawal requests for an offer user.
  public func getMyWithdrawals(
    withdrawals : Map.Map<Nat, OfferWithdrawal>,
    offerUserId : Nat,
  ) : [OfferWithdrawal] {
    OPLib.listWithdrawalsByUser(withdrawals, offerUserId);
  };

  // ── Admin: Offer Control Center ───────────────────────────────────────────

  /// Get all offer users (admin only — caller already verified).
  public func adminListOfferUsers(
    offerUsers : Map.Map<Nat, OfferUser>,
  ) : [OfferUser] {
    offerUsers.values().toArray();
  };

  /// Get all pending withdrawal requests (admin only).
  public func adminListPendingWithdrawals(
    withdrawals : Map.Map<Nat, OfferWithdrawal>,
  ) : [OfferWithdrawal] {
    withdrawals.values()
      .filter(func(w : OfferWithdrawal) : Bool { w.status == #pending })
      .toArray();
  };

  /// Admin: resolve a withdrawal request (approve/reject/paid).
  /// On #paid or #approved, deducts pendingEarnings from user.
  public func adminResolveWithdrawal(
    offerUsers  : Map.Map<Nat, OfferUser>,
    withdrawals : Map.Map<Nat, OfferWithdrawal>,
    id          : Nat,
    newStatus   : { #approved; #rejected; #paid },
    adminNote   : ?Text,
  ) : Bool {
    switch (withdrawals.get(id)) {
      case null { false };
      case (?wd) {
        if (wd.status != #pending) { return false };
        withdrawals.add(id, { wd with
          status      = newStatus;
          processedAt = ?Time.now();
          adminNote;
        });
        // On rejection: restore earnings back to user totalEarnings
        if (newStatus == #rejected) {
          switch (offerUsers.get(wd.offerUserId)) {
            case null {};
            case (?user) {
              let safeDeduct = if (user.pendingEarnings >= wd.amount) { wd.amount } else { user.pendingEarnings };
              offerUsers.add(wd.offerUserId, { user with
                totalEarnings   = user.totalEarnings + safeDeduct;
                pendingEarnings = user.pendingEarnings - safeDeduct;
              });
            };
          };
        } else if (newStatus == #paid) {
          // Mark paid: remove from pendingEarnings (already deducted from total)
          switch (offerUsers.get(wd.offerUserId)) {
            case null {};
            case (?user) {
              let safeDeduct = if (user.pendingEarnings >= wd.amount) { wd.amount } else { user.pendingEarnings };
              offerUsers.add(wd.offerUserId, { user with
                pendingEarnings = user.pendingEarnings - safeDeduct;
              });
            };
          };
        };
        true;
      };
    };
  };

  /// Admin: get current Offer Portal config (pass-through).
  public func getOfferPortalConfig(config : OfferPortalConfig) : OfferPortalConfig {
    config;
  };

  /// Admin: update Offer Portal config.
  public func updateOfferPortalConfig(
    _currentConfig : OfferPortalConfig,
    newConfig      : OfferPortalConfig,
  ) : OfferPortalConfig {
    newConfig;
  };

  // ── SMS config ────────────────────────────────────────────────────────────

  public func getSmsConfig(config : SmsConfig) : SmsConfig {
    config;
  };

  public func updateSmsConfig(
    _currentConfig : SmsConfig,
    newConfig      : SmsConfig,
  ) : SmsConfig {
    newConfig;
  };

  // ── Recharge Receipts ─────────────────────────────────────────────────────

  /// Generate a receipt after a successful recharge.
  public func generateRechargeReceipt(
    receipts    : Map.Map<Nat, RechargeReceipt>,
    nextId      : Nat,
    userId      : Nat,
    mobile      : Text,
    operator    : Text,
    circle      : Text,
    amount      : Nat,
    commission  : Nat,
    netCost     : Nat,
    txnId       : Nat,
    referenceId : Text,
  ) : RechargeReceipt {
    let receipt : RechargeReceipt = {
      id          = nextId;
      txnId;
      userId;
      mobile;
      operator;
      circle;
      amount;
      commission;
      netCost;
      referenceId;
      generatedAt = Time.now();
    };
    receipts.add(nextId, receipt);
    receipt;
  };

  /// Get a receipt by transaction ID.
  public func getReceiptByTxnId(
    receipts : Map.Map<Nat, RechargeReceipt>,
    txnId    : Nat,
  ) : ?RechargeReceipt {
    receipts.values().find(func(r : RechargeReceipt) : Bool { r.txnId == txnId });
  };

  /// Get all receipts for a user.
  public func getMyReceipts(
    receipts : Map.Map<Nat, RechargeReceipt>,
    userId   : Nat,
  ) : [RechargeReceipt] {
    receipts.values()
      .filter(func(r : RechargeReceipt) : Bool { r.userId == userId })
      .toArray();
  };

};
