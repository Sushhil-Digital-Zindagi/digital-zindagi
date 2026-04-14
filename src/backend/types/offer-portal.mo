// types/offer-portal.mo — Offer Portal & SMS domain types
module {

  /// A user of the isolated Digital Zindagi Offer Portal.
  /// userId is prefixed with "offer_user_" to isolate from main user IDs.
  public type OfferUser = {
    id            : Nat;
    userId        : Text;    // e.g. "offer_user_42"
    email         : Text;
    passwordHash  : Text;    // stored as-is (future: apply hashing)
    referralCode  : Text;    // unique referral code for this user
    referredBy    : ?Text;   // referral code of the referrer, if any
    totalEarnings : Nat;     // lifetime credited earnings (paise / smallest unit)
    pendingEarnings : Nat;   // not-yet-credited earnings
    createdAt     : Int;
  };

  /// A credit or debit event in the Offer Portal ledger.
  public type OfferTransaction = {
    id          : Nat;
    offerUserId : Nat;
    txType      : { #cpalead; #referralBonus; #manualCredit };
    amount      : Nat;       // in paise / smallest unit
    description : Text;
    createdAt   : Int;
    status      : { #pending; #credited; #reversed };
  };

  /// A withdrawal request from an Offer Portal user.
  public type OfferWithdrawal = {
    id          : Nat;
    offerUserId : Nat;
    upiId       : Text;
    amount      : Nat;
    status      : { #pending; #approved; #rejected; #paid };
    requestedAt : Int;
    processedAt : ?Int;
    adminNote   : ?Text;
  };

  /// Global configuration for the Offer Portal.
  public type OfferPortalConfig = {
    isEnabled              : Bool;
    cpaLeadWebhookSecret   : Text;   // generic offer-wall webhook secret (works with any offer wall)
    cpagripApiKey          : Text;   // CPAGrip API key for fetching automatic offers
    adminProfitPct         : Nat;   // e.g. 60 (%)
    userProfitPct          : Nat;   // e.g. 40 (%)
  };

  /// SMS provider (Fast2SMS) configuration.
  public type SmsConfig = {
    fast2smsApiKey : Text;
    senderId       : Text;
    isEnabled      : Bool;
  };

  /// Digital receipt generated after a successful recharge.
  public type RechargeReceipt = {
    id          : Nat;
    txnId       : Nat;       // links to RechargeTransaction.id
    userId      : Nat;
    mobile      : Text;
    operator    : Text;
    circle      : Text;
    amount      : Nat;
    commission  : Nat;
    netCost     : Nat;
    referenceId : Text;
    generatedAt : Int;
  };

};
