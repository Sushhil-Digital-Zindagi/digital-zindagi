// types/admin-settings.mo — Unified Admin Settings type
// All Admin Panel configurable values stored in the canister.
module {

  /// Legacy AdminSettings type — compatible with previously deployed canister.
  /// Does NOT include cpagripWebhookSecret or cpagripOfferWallName (added as
  /// separate stable vars in main.mo to avoid upgrade compatibility errors).
  public type AdminSettings = {
    // ── Referral / MLM rates ──────────────────────────────────────────────
    referralLevel1Pct : Nat;   // default 5
    referralLevel2Pct : Nat;   // default 2
    referralLevel3Pct : Nat;   // default 1
    referralLevel4Pct : Float; // default 0.5
    referralLevel5Pct : Float; // default 0.25

    // ── Payment / UPI ─────────────────────────────────────────────────────
    upiId             : Text;
    upiQrCodeUrl      : Text;
    razorpayKeyId     : Text;
    razorpayKeySecret : Text;

    // ── Ludo / Rewards ────────────────────────────────────────────────────
    pointsPerAd       : Nat;   // default 10
    redemptionRate    : Nat;   // points per ₹1, default 100
    minWithdrawal     : Nat;   // minimum withdrawal in ₹, default 50

    // ── Offer Portal ─────────────────────────────────────────────────────
    cpagripApiKey     : Text;

    // ── Cloudinary configuration ──────────────────────────────────────────
    cloudinaryCloudName : Text;  // default: "dquyiiu7o"
    cloudinaryApiKey    : Text;  // default: "199372638334688"
    cloudinaryApiSecret : Text;  // NEVER sent to frontend; kept server-side only

    // ── Feature toggles ───────────────────────────────────────────────────
    ludoEnabled       : Bool;
    rewardsEnabled    : Bool;
    gameEnabled       : Bool;
    udhaarBookEnabled : Bool;
  };

  /// Extended settings returned to clients — includes the new CPAGrip fields
  /// that are stored as separate stable vars in main.mo for upgrade compatibility.
  public type AdminSettingsExtended = {
    referralLevel1Pct    : Nat;
    referralLevel2Pct    : Nat;
    referralLevel3Pct    : Nat;
    referralLevel4Pct    : Float;
    referralLevel5Pct    : Float;
    upiId                : Text;
    upiQrCodeUrl         : Text;
    razorpayKeyId        : Text;
    razorpayKeySecret    : Text;
    pointsPerAd          : Nat;
    redemptionRate       : Nat;
    minWithdrawal        : Nat;
    cpagripApiKey        : Text;
    cpagripWebhookSecret : Text;
    cpagripOfferWallName : Text;
    cloudinaryCloudName  : Text;
    cloudinaryApiKey     : Text;
    cloudinaryApiSecret  : Text;
    ludoEnabled          : Bool;
    rewardsEnabled       : Bool;
    gameEnabled          : Bool;
    udhaarBookEnabled    : Bool;
  };

};
