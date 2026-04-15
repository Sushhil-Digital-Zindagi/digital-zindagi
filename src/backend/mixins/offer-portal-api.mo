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
  /// Returns #ok(OfferUser) — the full created user — or #err(reason).
  /// Returning the full user object allows the caller to auto-login without
  /// a second round-trip, eliminating the race condition on first signup.
  public func registerOfferUser(
    offerUsers    : Map.Map<Nat, OfferUser>,
    nextId        : Nat,
    email         : Text,
    passwordHash  : Text,
    referralCode  : ?Text,
  ) : { #ok : OfferUser; #err : Text } {
    // Reject duplicate emails
    switch (OPLib.findByEmail(offerUsers, email)) {
      case (?_) { return #err("already_registered") };
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
    #ok(user);
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
  ) : { totalEarnings : Nat; pendingEarnings : Nat; referralCode : Text; tier1Earnings : Nat; tier2Earnings : Nat; tier3Earnings : Nat } {
    switch (offerUsers.get(offerUserId)) {
      case null {
        { totalEarnings = 0; pendingEarnings = 0; referralCode = ""; tier1Earnings = 0; tier2Earnings = 0; tier3Earnings = 0 };
      };
      case (?user) {
        {
          totalEarnings   = user.totalEarnings;
          pendingEarnings = user.pendingEarnings;
          referralCode    = user.referralCode;
          tier1Earnings   = user.tier1Earnings;
          tier2Earnings   = user.tier2Earnings;
          tier3Earnings   = user.tier3Earnings;
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
  /// Also distributes 3-tier MLM commissions from the gross amount to ancestors.
  /// Returns #ok(nextTxnId) reflecting how many txn IDs were consumed, #err(reason) on failure.
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
        // Create the primary user transaction
        let txn = OPLib.createOfferTransaction(
          nextTxnId, offerUserId, #cpalead, userShare, desc,
        );
        offerTxns.add(nextTxnId, txn);
        // Credit userShare to the user's totalEarnings
        offerUsers.add(offerUserId, { user with
          totalEarnings = user.totalEarnings + userShare;
        });
        // Distribute 3-tier MLM commissions from grossAmount to ancestors
        let afterMlm = distributeMlmCommissions(
          offerUsers, offerTxns, nextTxnId + 1,
          offerUserId, grossAmount, "offer wall postback",
        );
        #ok(afterMlm);
      };
    };
  };

  // ── Referral bonus (3-tier MLM) ───────────────────────────────────────────

  /// Credit 3-tier MLM referral commissions from a gross earning event.
  /// Chain: earner.referredBy = tier1 (5%), tier1.referredBy = tier2 (2%), tier2.referredBy = tier3 (1%).
  /// Commissions are calculated from the raw grossAmount BEFORE profit split.
  /// Stores OfferTransaction records for each tier commission credited.
  /// Returns the next unused txnId after all distributions (may equal startTxnId if none distributed).
  public func distributeMlmCommissions(
    offerUsers    : Map.Map<Nat, OfferUser>,
    offerTxns     : Map.Map<Nat, OfferTransaction>,
    startTxnId    : Nat,
    earnerUserId  : Nat,
    grossAmount   : Nat,
    triggerDesc   : Text,
  ) : Nat {
    var nextId = startTxnId;

    // Resolve the referral chain up to 3 tiers from the earner
    let mEarner = offerUsers.get(earnerUserId);
    let tier1Code : ?Text = switch (mEarner) {
      case null { null };
      case (?earner) { earner.referredBy };
    };

    let mTier1 : ?OfferUser = switch (tier1Code) {
      case null { null };
      case (?code) { OPLib.findByReferralCode(offerUsers, code) };
    };

    let tier2Code : ?Text = switch (mTier1) {
      case null { null };
      case (?t1) { t1.referredBy };
    };

    let mTier2 : ?OfferUser = switch (tier2Code) {
      case null { null };
      case (?code) { OPLib.findByReferralCode(offerUsers, code) };
    };

    let tier3Code : ?Text = switch (mTier2) {
      case null { null };
      case (?t2) { t2.referredBy };
    };

    let mTier3 : ?OfferUser = switch (tier3Code) {
      case null { null };
      case (?code) { OPLib.findByReferralCode(offerUsers, code) };
    };

    // Tier 1 — 5% of grossAmount
    switch (mTier1) {
      case null {};
      case (?t1) {
        let bonus = (grossAmount * 5) / 100;
        if (bonus > 0) {
          let desc = "Tier-1 referral bonus (5%) from " # triggerDesc # " | base: ₹" # grossAmount.toText();
          let txn = OPLib.createOfferTransaction(nextId, t1.id, #referralBonus, bonus, desc);
          offerTxns.add(nextId, txn);
          nextId += 1;
          offerUsers.add(t1.id, { t1 with
            totalEarnings = t1.totalEarnings + bonus;
            tier1Earnings = t1.tier1Earnings + bonus;
          });
        };
      };
    };

    // Tier 2 — 2% of grossAmount
    switch (mTier2) {
      case null {};
      case (?t2) {
        let bonus = (grossAmount * 2) / 100;
        if (bonus > 0) {
          let desc = "Tier-2 referral bonus (2%) from " # triggerDesc # " | base: ₹" # grossAmount.toText();
          let txn = OPLib.createOfferTransaction(nextId, t2.id, #referralBonus, bonus, desc);
          offerTxns.add(nextId, txn);
          nextId += 1;
          offerUsers.add(t2.id, { t2 with
            totalEarnings = t2.totalEarnings + bonus;
            tier2Earnings = t2.tier2Earnings + bonus;
          });
        };
      };
    };

    // Tier 3 — 1% of grossAmount
    switch (mTier3) {
      case null {};
      case (?t3) {
        let bonus = (grossAmount * 1) / 100;
        if (bonus > 0) {
          let desc = "Tier-3 referral bonus (1%) from " # triggerDesc # " | base: ₹" # grossAmount.toText();
          let txn = OPLib.createOfferTransaction(nextId, t3.id, #referralBonus, bonus, desc);
          offerTxns.add(nextId, txn);
          nextId += 1;
          offerUsers.add(t3.id, { t3 with
            totalEarnings = t3.totalEarnings + bonus;
            tier3Earnings = t3.tier3Earnings + bonus;
          });
        };
      };
    };

    nextId;
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
  /// Returns #ok(true) on success, #err(reason) on validation failure.
  /// Validation: if cpaLeadWebhookSecret is non-empty it must be >= 8 chars.
  public func updateOfferPortalConfig(
    _currentConfig : OfferPortalConfig,
    newConfig      : OfferPortalConfig,
  ) : { #ok : Bool; #err : Text } {
    // API key validation — empty = no offer wall yet (allowed), non-empty = must be ≥ 8 chars
    if (newConfig.cpaLeadWebhookSecret != "" and newConfig.cpaLeadWebhookSecret.size() < 8) {
      return #err("API key too short — minimum 8 characters");
    };
    #ok(true);
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
